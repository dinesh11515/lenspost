import {createContext,useState} from 'react';
import {ethers} from 'ethers';
import Navbar from '../components/Navbar';
import {client,getProfiles,getDefaultProfile,challenge,authenticate} from '../components/api'
export const lensContext = createContext();
import { setAuthenticationToken } from '../components/token';
export default function Layout({children}) {
    
    const [connected, setConnected] = useState(false);
    const [provider,setProvider] = useState(null);
    const [contract,setContract] = useState(null);
    const [account,setAccount] = useState(null);
    const [token, setToken] = useState()
    const [profile, setProfile] = useState()
    const [profileId, setProfileId] = useState('')
    const [handle, setHandle] = useState('')
    const [hasHandle, setHasHandle] = useState(true)
  
    
    const networks = {
        polygon: {
          chainId: `0x${Number(137).toString(16)}`,
          chainName: "Polygon Testnet",
          nativeCurrency: {
            name: "MATIC",
            symbol: "MATIC",
            decimals: 18
          },
          rpcUrls: ["https://polygon-rpc.com/"],
          blockExplorerUrls: ["https://polygonscan.com/"]
        }
    }
      


    const connectWallet = async () => {
        try{
            const provider = new ethers.providers.Web3Provider(window.ethereum,"any");           
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            
            const address = await signer.getAddress();
            setAccount(address);
            
            let response = await client.query({
              query: getDefaultProfile,
              variables: {
                address
              }
            })
            console.log(response)
            if(response.data.defaultProfile === null){
              response = await client.query({
                query: getProfiles,
                variables: {
                  ownedBy: address
                }
              })
              if(response.data.profiles.items.length > 0){
                setProfileId(response.data.profiles.items[0].id)
                setHandle(response.data.profiles.items[0].handle)
                setProfile(response.data.profiles.items)
              }
              else{
                setHasHandle(false);
                
              }
            }else{
              setProfileId(response.data.defaultProfile.id)
              setHandle(response.data.defaultProfile.handle)
              setProfile(response.data.defaultProfile)
            }
            
            setProvider(signer);
            setConnected(true);
        }
        catch(err){
            console.log(err.message);
        }
    }

  const  signInWithLens = async() => {
    try {
      const address = account;
      console.log(address)
      const challengeInfo = await client.query({
        query: challenge,
        variables: { address }
      })
      
      const signature = await provider.signMessage(challengeInfo.data.challenge.text)
      const authData = await client.mutate({
          mutation: authenticate,
          variables: {
            address, signature
          }
      })
      const { data: { authenticate: { accessToken }}} = authData
      localStorage.setItem('lens-auth-token', accessToken)
      setToken(accessToken)
      setAuthenticationToken(accessToken)
    } catch (err) {
      console.log('Error signing in: ', err)
    }
  }
    
    return(
        <lensContext.Provider value={{
            connected,
            connectWallet,
            signInWithLens,
            account,
            profile,
            profileId,
            handle,
            token,
            provider,
            hasHandle
        }}>
            <Navbar />
            {children}
        </lensContext.Provider>
    )
}