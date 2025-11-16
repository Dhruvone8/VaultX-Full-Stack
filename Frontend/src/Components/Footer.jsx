import React from 'react'

const Footer = () => {
  return (
    <footer className="bg-indigo-800 text-white w-full py-3 px-4 flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between items-center text-center sm:text-left">
      <div className="font-bold text-2xl flex items-center justify-center">
        <span className="text-cyan-400">&lt;</span>
        VaultX
        <span className="text-cyan-400">/&gt;</span>
      </div>
      <p className="text-xs sm:text-sm font-medium">
        © 2025 Dhruv Singhania. All rights reserved.
      </p>
    </footer>
  )
}

export default Footer 