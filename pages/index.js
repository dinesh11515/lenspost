import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useContext,useState } from 'react'
import { lensContext } from '../context/lensContext'
import { v4 as uuid } from 'uuid'
import { ethers } from 'ethers'
import { DownOutlined } from '@ant-design/icons';
import { Dropdown, Space } from 'antd';
import { client,createProfileRequest,createPostViaDispatcherRequest,
  signCreatePostTypedData,LENS_HUB_CONTRACT, splitSignature, validateMetadata,broadcastRequest} from '../components/api'
import { LENS_HUB_ABI } from '../components/abi'

import { create } from 'ipfs-http-client'

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID
const projectSecret = process.env.NEXT_PUBLIC_PROJECT_SECRET
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const ipfsClient = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
      authorization: auth,
  },
})
export default function Home() {
  const {handle,provider,token,profileId,profile,hasHandle,signInWithLens,connectWallet,connected} = useContext(lensContext)
  const [postData,setPostData] = useState(null)
  const [handleName,setHandleName] = useState("")
  const [fileType, setFileType] = useState("File Type")
  const [file,setFile] = useState(null)
  const items = [
    {
      label:<button onClick={()=>setFileType("IMAGE")}>Image</button>,
      key: '0',
    },
    {
      label: <button onClick={()=>setFileType("VIDEO")}>Video</button>,
      key: '1',
    },
    {
      label: <button onClick={()=>setFileType("AUDIO")}>Audio</button>,
      key: '2',
    },
  ];
  
  const uploadToIpfs = async () => {
    try{
      let added;
      if(file){
        added = await ipfsClient.add(file)
      }
      
      const metadata = {
        version: '2.0.0',
        content: postData,
        description: postData,
        name: `Post by @${handle}`,
        external_url: `https://lenster.xyz/u/${handle}`,
        metadata_id: uuid(),
        mainContentFocus: file ? fileType :'TEXT_ONLY',
        media : file ? [
          {
            item: "ipfs://"+added.path,
            type: file.type,
          },
        ] : [],
        locale: 'en-US',
        attributes: []
      }

      const result = await client.query({
        query: validateMetadata,
        variables: {
          metadata: metadata
        }
      })
      console.log("result",result)
      if(!result.data.validatePublicationMetadata.valid){
        throw new Error("Invalid metadata")
      }
      const cid = await ipfsClient.add(JSON.stringify(metadata))
      console.log("cid",cid)
      return cid;
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
        contentURI: 'ipfs://' + url.path,
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
  
  
  const postViaDispacter = async () => {
    try{
      const url = await uploadToIpfs()
      const createPostRequest = {
        profileId,
        contentURI: 'ipfs://' + url.path,
        collectModule: {
          freeCollectModule: { followerOnly: false }
        },
        referenceModule: {
          followerOnlyReferenceModule: false
        },
      }
      const result = await createPostViaDispatcherRequest(createPostRequest);
      console.log(result);
    }
    catch(err){
      console.log(err)
    }
  }
  
  const postViaBroadcast = async () => {
    try{
      const url = await uploadToIpfs()
      console.log(url)
      const createPostRequest = {
        profileId,
        contentURI: 'ipfs://' + url.path,
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
      console.log(result);
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
  const createProfile = async () => {
    try {
      await signInWithLens();
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
      await connectWallet()
    }
    catch(err){
      console.log(err)
    }
  }
  
  
  return (
    <div className={styles.container}>
      <Head>
        <title>LensPost</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {
        hasHandle ? 
        <div className='flex flex-col items-center '>
        <div className='mx-40 flex justify-center flex-col text-xl gap-6 w-1/3'>
        <textarea className='w-full h-1/3 border-2 border-gray-300 rounded-lg p-4 focus:outline-none' onChange={onChange} placeholder='Write your post here...'></textarea>
        <input type="file" accept="image/gif,image/jpeg,image/png,image/tiff,image/x-ms-bmp,image/svg+xml,image/webp,video/webm,video/mp4,video/x-m4v,video/ogv
              ,video/ogg,audio/wav,audio/mpeg,audio/ogg" onChange={(e) => setFile(e.target.files[0])}/>
        <Dropdown
          menu={{
            items,
          }}
          trigger={['click']}
        >
          <a>
            <Space>
              {fileType}
              <DownOutlined />
            </Space>
          </a>
        </Dropdown>
        {
          connected ? 
          token ?
          <div className='flex items-center gap-10 text-lg justify-center'>
            <button className='bg-[#abfe2ccc]  px-14 py-2 rounded-xl' onClick={post}>Post </button>
            <button className='bg-[#abfe2ccc]  rounded-xl px-14 py-2' onClick={postViaBroadcast}>Post gasless</button>
          </div>
          :
          <button className='bg-[#abfe2ccc]  px-14 py-2 rounded-xl' onClick={signInWithLens}>Sign in with {handle}</button>
          :
          <button className='bg-[#abfe2ccc]  px-14 py-2 rounded-xl' onClick={connectWallet}>Connect Wallet</button>
        }
        
        </div>
        </div>
        :
        <div className='mx-40 flex items-center flex-col gap-4'>
          <input className='w-1/3 h-1/3 border-2 border-gray-300 rounded-lg p-3 focus:outline-none' onChange={onChangeHandle} placeholder='Enter some name for Claiming handle...'></input>
          <button className='bg-blue-500 text-white rounded-lg px-4 py-2 ml-4' onClick={createProfile}>Create Profile</button>
        </div>
      }
      

    </div>
  )
}
