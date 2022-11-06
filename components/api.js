import { setContext } from '@apollo/client/link/context';
import { ApolloClient, HttpLink, ApolloLink, InMemoryCache, from ,gql} from '@apollo/client';
import omitDeep from 'omit-deep'
import { onError } from '@apollo/client/link/error';
import fetch from 'cross-fetch';
import LENS_HUB_ABI from './abi.js'
import { utils,ethers } from 'ethers';
export const LENS_HUB_CONTRACT = "0x60Ae865ee4C725cd04353b5AAb364553f56ceF82"
import { getAuthenticationToken } from './token.js';
const defaultOptions = {
  watchQuery: {
    fetchPolicy: 'no-cache',
    errorPolicy: 'ignore',
  },
  query: {
    fetchPolicy: 'no-cache',
    errorPolicy: 'all',
  },
};


const API_URL = 'https://api-mumbai.lens.dev'
const httpLink = new HttpLink({ 
  uri: API_URL,
  fetch,
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)
    );

  if (networkError) console.log(`[Network error]: ${networkError}`);
});
const authLink = new ApolloLink((operation, forward) => {
  const token = getAuthenticationToken();
  operation.setContext({
    headers: {
      'x-access-token': token ? `Bearer ${token}` : '',
    },
  });getAuthenticationToken
  return forward(operation);
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: defaultOptions,
});
// const authLink = setContext((_, { headers }) => {
//   const token = window.localStorage.getItem('lens-auth-token')
//   return {
//     headers: {
//       ...headers,
//       authorization: token ? `Bearer ${token}` : "",
//     }
//   }
// })

// const httpLink = createHttpLink({
//   uri: API_URL
// }) 

// export const client = new ApolloClient({
//   uri:authLink.concat(httpLink),
//   cache: new InMemoryCache()
// })



export const getDefaultProfile = gql`
query DefaultProfile($address: EthereumAddress!) {
  defaultProfile(request: { ethereumAddress: $address}) {
    id
    handle
  }
}
`
export const createProfileRequest = gql`
mutation CreateProfile ($request: CreateProfileRequest!) {
  createProfile(request: $request) {
    ... on RelayerResult {
      txHash
    }
    ... on RelayError {
      reason
    }
    __typename
  }
}`
export const getProfiles = gql`
query Profiles ($ownedBy: [EthereumAddress!]){
  profiles(request: { ownedBy: $ownedBy }) {
    items {
      id
      name
      bio
      attributes {
        displayType
        traitType
        key
        value
      }
      followNftAddress
      metadata
      isDefault
      picture {
        ... on NftImage {
          contractAddress
          tokenId
          uri
          verified
        }
        ... on MediaSet {
          original {
            url
            mimeType
          }
        }
        __typename
      }
      handle
      coverPicture {
        ... on NftImage {
          contractAddress
          tokenId
          uri
          verified
        }
        ... on MediaSet {
          original {
            url
            mimeType
          }
        }
        __typename
      }
      ownedBy
      dispatcher {
        address
        canUseRelay
      }
      stats {
        totalFollowers
        totalFollowing
        totalPosts
        totalComments
        totalMirrors
        totalPublications
        totalCollects
      }
      followModule {
        ... on FeeFollowModuleSettings {
          type
          amount {
            asset {
              symbol
              name
              decimals
              address
            }
            value
          }
          recipient
        }
        ... on ProfileFollowModuleSettings {
         type
        }
        ... on RevertFollowModuleSettings {
         type
        }
      }
    }
    pageInfo {
      prev
      next
      totalCount
    }
  }
}`
export const setDefaultProfile = gql`
mutation CreateSetDefaultProfileTypedData {
  createSetDefaultProfileTypedData(request: { profileId: "#86584"}) {
    id
    expiresAt
    typedData {
      types {
        SetDefaultProfileWithSig {
          name
          type
        }
      }
      domain {
        name
        chainId
        version
        verifyingContract
      }
      value {
        nonce
        deadline
        wallet
        profileId
      }
    }
  }
}`
export const challenge = gql`
  query Challenge($address: EthereumAddress!) {
    challenge(request: { address: $address }) {
      text
    }
  }
`

export const authenticate = gql`
  mutation Authenticate(
    $address: EthereumAddress!
    $signature: Signature!
  ) {
    authenticate(request: {
      address: $address,
      signature: $signature
    }) {
      accessToken
      refreshToken
    }
  }
`

export const recommendedProfiles = gql`
query RecommendedProfiles {
  recommendedProfiles {
        id
      name
      bio
      attributes {
        displayType
        traitType
        key
        value
      }
        followNftAddress
      metadata
      isDefault
      picture {
        ... on NftImage {
          contractAddress
          tokenId
          uri
          verified
        }
        ... on MediaSet {
          original {
            url
            mimeType
          }
        }
        __typename
      }
      handle
      coverPicture {
        ... on NftImage {
          contractAddress
          tokenId
          uri
          verified
        }
        ... on MediaSet {
          original {
            url
            mimeType
          }
        }
        __typename
      }
      ownedBy
      dispatcher {
        address
        canUseRelay
      }
      stats {
        totalFollowers
        totalFollowing
        totalPosts
        totalComments
        totalMirrors
        totalPublications
        totalCollects
      }
      followModule {
        ... on FeeFollowModuleSettings {
          type
          amount {
            asset {
              symbol
              name
              decimals
              address
            }
            value
          }
          recipient
        }
        ... on ProfileFollowModuleSettings {
         type
        }
        ... on RevertFollowModuleSettings {
         type
        }
      }
  }
}`

export const validateMetadata = gql`
query ValidatePublicationMetadata ($metadata: PublicationMetadataV2Input!) {
  validatePublicationMetadata(request: {
    metadatav2: $metadata
  }) {
    valid
    reason
  }
}
`

export const createPostTypedData = gql`
mutation createPostTypedData($request: CreatePublicPostRequest!) {
  createPostTypedData(request: $request) {
    id
    expiresAt
    typedData {
      types {
        PostWithSig {
          name
          type
        }
      }
      domain {
        name
        chainId
        version
        verifyingContract
      }
      value {
        nonce
        deadline
        profileId
        contentURI
        collectModule
        collectModuleInitData
        referenceModule
        referenceModuleInitData
      }
    }
  }
}
`
export const createPostViaDispatcher = gql`
mutation CreatePostViaDispatcher($request: CreatePublicPostRequest!)  {
  createPostViaDispatcher(
    request: $request
  ) {
    ... on RelayerResult {
      txHash
      txId
    }
    ... on RelayError {
      reason
    }
  }
}
`
export const createPostViaBroadcast = gql`
mutation Broadcast($request: BroadcastRequest!) {
  broadcast(request: $request) {
    ... on RelayerResult {
      txHash
      txId
    }
    ... on RelayError {
      reason
    }
  }
}`
export const hasTxHashBeenIndexed = gql`
query hasTxHashBeenIndexed($request: HasTxHashBeenIndexedRequest!) {
  hasTxHashBeenIndexed(request: $request) {
    ... on TransactionIndexedResult {
      indexed
      txReceipt {
        to
        from
        contractAddress
        transactionIndex
        root
        gasUsed
        logsBloom
        blockHash
        transactionHash
        blockNumber
        confirmations
        cumulativeGasUsed
        effectiveGasPrice
        byzantium
        type
        status
        logs {
          blockNumber
          blockHash
          transactionIndex
          removed
          address
          data
          topics
          transactionHash
          logIndex
        }
      }
      metadataStatus {
        status
        reason
      }
    }
    ... on TransactionError {
      reason
      txReceipt {
        to
        from
        contractAddress
        transactionIndex
        root
        gasUsed
        logsBloom
        blockHash
        transactionHash
        blockNumber
        confirmations
        cumulativeGasUsed
        effectiveGasPrice
        byzantium
        type
        status
        logs {
          blockNumber
          blockHash
          transactionIndex
          removed
          address
          data
          topics
          transactionHash
          logIndex
        }
      }
    },
    __typename
  }
  }

`
export async function createPostTypedDataMutation (request, token) {
  const result = await client.mutate({
    mutation: createPostTypedData,
    variables: {
      request,
    },
  })
  return result.data.createPostTypedData
}

function getSigner() {
  if (typeof window !== "undefined") {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner()
    return signer
  }
  return null
}

export const signedTypeData = (
  domain,
  types,
  value,
) => {
  const signer = getSigner();
  return signer._signTypedData(
    omit(domain, '__typename'),
    omit(types, '__typename'),
    omit(value, '__typename')
  )
}

export function omit (object, name) {
  return omitDeep(object, name);
};

export const splitSignature = (signature) => {
  return utils.splitSignature(signature)
}

export const signCreatePostTypedData = async (request, token) => {
  const result = await createPostTypedDataMutation(request, token)
  const typedData = result.typedData
  const signature = await signedTypeData(typedData.domain, typedData.types, typedData.value);
  return { result, signature };
}

export const broadcastRequest = async (request) => {
  const result = await client.mutate({
    mutation: createPostViaBroadcast,
    variables: {
      request,
    },
  });

  return result.data.broadcast;
};

export const createPostViaDispatcherRequest = async (request) => {
  const result = await client.mutate({
    mutation: createPostViaDispatcher,
    variables: {
      request,
    }
  });

  return result.data.createPostViaDispatcher;
};