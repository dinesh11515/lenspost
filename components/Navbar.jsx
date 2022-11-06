import Link from "next/link";
import { useContext } from "react";
import { lensContext } from "../context/lensContext";
export default function Navbar() {
    const { connected, connectWallet,handle ,signInWithLens,token} = useContext(lensContext);
    return (
        <div className="text-black flex items-center justify-between mx-40 my-8">
            <div>
               <p>LensPost</p>
            </div>
            <div className="flex items-center gap-20 ">
                <Link href="/">
                    <button>Post</button>
                </Link>
                <Link href="/profile">
                    <button>Profile</button>
                </Link>
                {
                    connected ? 
                    token !== undefined ? <button className="bg-[#abfe2ccc] px-5 py-2 rounded-full">{handle}</button> 
                    :
                    <button className="bg-[#abfe2ccc] px-5 py-2 rounded-full" onClick={signInWithLens}>Sign in With {handle}</button>
                    : 
                    <button className="bg-[#abfe2ccc] px-5 py-2 rounded-full" onClick={connectWallet}>Connect Wallet</button>
                }
            </div>
        </div>
        
    );
}
