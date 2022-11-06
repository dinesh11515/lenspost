import Link from "next/link";
import { useContext } from "react";
import { lensContext } from "../context/lensContext";
export default function Navbar() {
    const { connected, connectWallet,handle ,signInWithLens,token} = useContext(lensContext);
    return (
        <div className="text-black flex items-center justify-between mx-40 my-8 text-xl">
            <div>
               <p>LensPost</p>
            </div>
            <div className="flex items-center gap-20 text-lg ">
                
                
                {
                    connected ? 
                    token !== undefined && handle? <button className="bg-[#abfe2ccc] px-5 py-2 rounded-full">{handle}</button> 
                    :
                    handle ?

                    <button className="bg-[#abfe2ccc] px-5 py-2 rounded-full" onClick={signInWithLens}>Sign in With {handle}</button>
                    :
                    <button className="bg-[#abfe2ccc] px-5 py-2 rounded-full" onClick={signInWithLens}>connected</button>
                    : 
                    <button className="bg-[#abfe2ccc] px-5 py-2 rounded-full" onClick={connectWallet}>Connect Wallet</button>
                }
            </div>
        </div>
        
    );
}
