import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useContext,useState } from 'react'
import { lensContext } from '../context/lensContext'
import { v4 as uuid } from 'uuid'
import { ethers } from 'ethers'
import { client, challenge, authenticate, getDefaultProfile,createPostTypedData,createPostViaDispatcher,hasTxHashBeenIndexed,createProfileRequest,
  signCreatePostTypedData,LENS_HUB_CONTRACT, splitSignature, validateMetadata,createPostViaBroadcast} from '../components/api'
import { LENS_HUB_ABI } from '../components/abi'
import { Web3Storage } from 'web3.storage';
import { UploadOutlined } from '@ant-design/icons';
import { Button, Upload } from 'antd';
export default function Home() {
  const {handle,provider,token,profileId,profile,hasHandle,signInWithLens} = useContext(lensContext)
  const [postData,setPostData] = useState(null)
  const [handleName,setHandleName] = useState("")
  function makeFileObjects (data) {
    const obj = data;
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' })
  
    const files = [
      new File([blob], 'post.json')
    ]
    return files
  }
  const uploadToIpfs = async () => {
    try{
      const metadata = {
        version: '2.0.0',
        content: postData,
        description: postData,
        name: `Post by @${handle}`,
        external_url: `https://lenster.xyz/u/${handle}`,
        metadata_id: uuid(),
        mainContentFocus: 'TEXT_ONLY',
        attributes: [],
        locale: 'en-US',
      }
      console.log(uuid())
      console.log(metadata)
      const result = await client.query({
        query: validateMetadata,
        variables: {
          metadata: metadata
        }
      })
      console.log('Metadata verification request: ', result)
      const ipfsClient = new Web3Storage({ token: process.env.NEXT_PUBLIC_WEB3_STORAGE_KEY });
      const files = makeFileObjects(metadata);
      const cid = await ipfsClient.put([files[0]]);
      const url = ("ipfs://"+cid+"/post.json");
      return url;
    }
    catch(err){
      console.log(err)
    }
  }
  const post = async () => {
    try {
      const url = await uploadToIpfs()
      const createPostRequest = {
        profileId,
        contentURI: url,
        collectModule: {
          freeCollectModule: { followerOnly: true }
        },
        referenceModule: {
          followerOnlyReferenceModule: false
        },
      }
      const signedResult = await signCreatePostTypedData(createPostRequest, token)
      const typedData = signedResult.result.typedData
      const { v, r, s } = splitSignature(signedResult.signature)
      const lensHub = new ethers.Contract(LENS_HUB_CONTRACT, LENS_HUB_ABI, provider)
      const tx = await lensHub.postWithSig({
        profileId: typedData.value.profileId,
        contentURI: typedData.value.contentURI,
        collectModule: typedData.value.collectModule,
        collectModuleInitData: typedData.value.collectModuleInitData,
        referenceModule: typedData.value.referenceModule,
        referenceModuleInitData: typedData.value.referenceModuleInitData,
        sig: {
          v,
          r,
          s,
          deadline: typedData.value.deadline,
        },
      })
      console.log(tx)
    }
    catch(err){
      console.log(err)
    }
  }
  const createPostViaDispatcherRequest = async (request) => {
    const result = await client.mutate({
      mutation: createPostViaDispatcher,
      variables: {
        request,
      },
      context: {
        headers: {
          "x-access-token": `Bearer ${token}`
        }
      }
    });
  
    return result.data.createPostViaDispatcher;
  };
  const hasTxBeenIndexed = async (request) => {
    const result = await client.query({
      query: hasTxHashBeenIndexed,
      variables: {
        request,
      },
      fetchPolicy: 'network-only',
    });
  
    return result.data.hasTxHashBeenIndexed;
  };
  const pollUntilIndexed = async (input) => {
    while (true) {
      const response = await hasTxBeenIndexed(input);
      console.log('pool until indexed: result', response);
  
      if (response.__typename === 'TransactionIndexedResult') {
        console.log('pool until indexed: indexed', response.indexed);
        console.log('pool until metadataStatus: metadataStatus', response.metadataStatus);
  
        console.log(response.metadataStatus);
        if (response.metadataStatus) {
          if (response.metadataStatus.status === 'SUCCESS') {
            return response;
          }
  
          if (response.metadataStatus.status === 'METADATA_VALIDATION_FAILED') {
            throw new Error(response.metadataStatus.status);
          }
        } else {
          if (response.indexed) {
            return response;
          }
        }
  
        console.log('pool until indexed: sleep for 1500 milliseconds then try again');
        // sleep for a second before trying again
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else {
        // it got reverted and failed!
        throw new Error(response.reason);
      }
    }
  };
  const postViaDispacter = async () => {
    try{
      const url = await uploadToIpfs()
      const createPostRequest = {
        profileId,
        contentURI: url,
        collectModule: {
          freeCollectModule: { followerOnly: false }
        },
        referenceModule: {
          followerOnlyReferenceModule: false
        },
      }
      const result = await createPostViaDispatcherRequest(createPostRequest);
      console.log('create post via dispatcher: createPostViaDispatcherRequest', result);
      const indexedResult = await pollUntilIndexed({txId: result.txId});

      console.log('create post: profile has been indexed', result);

      const logs = indexedResult.txReceipt.logs;

      console.log('create post: logs', logs);

      const topicId = utils.id(
        'PostCreated(uint256,uint256,string,address,bytes,address,bytes,uint256)'
      );
      console.log('topicid we care about', topicId);

      const profileCreatedLog = logs.find((l) => l.topics[0] === topicId);
      console.log('create post: created log', profileCreatedLog);

      let profileCreatedEventLog = profileCreatedLog.topics;
      console.log('create post: created event logs', profileCreatedEventLog);

      const publicationId = utils.defaultAbiCoder.decode(['uint256'], profileCreatedEventLog[2])[0];

      console.log('create post: contract publication id', BigNumber.from(publicationId).toHexString());
      console.log(
        'create post: internal publication id',
        profileId + '-' + BigNumber.from(publicationId).toHexString()
      );

    }
    catch(err){
      console.log(err)
    }
  }
  const broadcastRequest = async (request) => {
    const result = await client.mutate({
      mutation: createPostViaBroadcast,
      variables: {
        request,
      },
    });
  
    return result.data.broadcast;
  };
  const postViaBroadcast = async () => {
    try{
      const url = await uploadToIpfs()
      const createPostRequest = {
        profileId,
        contentURI: url,
        collectModule: {
          freeCollectModule: { followerOnly: false }
        },
        referenceModule: {
          followerOnlyReferenceModule: false
        },
      }
      const signedResult = await signCreatePostTypedData(createPostRequest, token)
      const result = await broadcastRequest({
        id: signedResult.result.id,
        signature: signedResult.signature,
      });
      console.log('create post via broadcast', result);
      const indexedResult = await pollUntilIndexed({txId: result.txId});

      console.log('create post: profile has been indexed', result);

      const logs = indexedResult.txReceipt.logs;

      console.log('create post: logs', logs);

      const topicId = utils.id(
        'PostCreated(uint256,uint256,string,address,bytes,address,bytes,uint256)'
      );
      console.log('topicid we care about', topicId);

      const profileCreatedLog = logs.find((l) => l.topics[0] === topicId);
      console.log('create post: created log', profileCreatedLog);

      let profileCreatedEventLog = profileCreatedLog.topics;
      console.log('create post: created event logs', profileCreatedEventLog);

      const publicationId = utils.defaultAbiCoder.decode(['uint256'], profileCreatedEventLog[2])[0];

      console.log('create post: contract publication id', BigNumber.from(publicationId).toHexString());
      console.log(
        'create post: internal publication id',
        profileId + '-' + BigNumber.from(publicationId).toHexString()
      );
      }
    catch(err){
      console.log(err)
    }
  }


  function onChange(e) {
    setPostData(e.target.value)
  }
  function onChangeHandle(e) {
    setHandleName(e.target.value)
  }
  console.log(handleName)
  const createProfile = async () => {
    try {
      // await signInWithLens();
      const request = {
        handle: handleName,
        profilePictureUri: null,
        followNFTURI: null,
        followModule: null
      }
      const response = await client.mutate({
        mutation: createProfileRequest,
        variables: {
          request: request,
        },
      });
      console.log(response)
    }
    catch(err){
      console.log(err)
    }
  }
  console.log(profileId)
  return (
    <div className={styles.container}>
      <Head>
        <title>LensPost</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {
        hasHandle ? 
        <div className='mx-40 flex items-center flex-col'>
        <textarea className='w-1/2 h-1/3 border-2 border-gray-300 rounded-lg p-4 focus:outline-none' onChange={onChange} placeholder='Write your post here...'></textarea>
        <input type="file" accept=".xls,.xlsx" />
    
        <button className='bg-blue-500 text-white rounded-lg px-4 py-2 ml-4' onClick={postViaBroadcast}>Post</button>
        </div>
        :
        <div className='mx-40 flex items-center flex-col'>
          <input className='w-1/2 h-1/3 border-2 border-gray-300 rounded-lg p-4 focus:outline-none' onChange={onChangeHandle} placeholder='Enter your handle...'></input>
          <button className='bg-blue-500 text-white rounded-lg px-4 py-2 ml-4' onClick={createProfile}>Create Profile</button>
        </div>
      }
      

    </div>
  )
}
