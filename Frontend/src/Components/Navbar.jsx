import React from 'react'

const Navbar = () => {
    return (
        <nav className='bg-indigo-800 text-white'>
            <div className="flex justify-between px-4 py-3 h-auto items-center">
                <div className="logo font-bold text-white text-2xl mx-3">
                    <span className='text-cyan-400'>&lt;</span>
                    VaultX
                    <span className='text-cyan-400'>/&gt;</span>
                </div>
                <button className='mx-2'>
                    <img className="cursor-pointer hover:scale-110 transition-all duration-300 invert w-12 mx-2" 
                    src="src/assets/github.png" alt="github" />
                </button>
            </div>
        </nav>
    )
}

export default Navbar