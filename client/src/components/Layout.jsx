import { useState } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full relative">
        {/* Mobile Header with Hamburger */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            InfraFlow
          </span>
          <button 
            onClick={() => setMobileOpen(true)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <svg aria-hidden="true" focusable="false" className="w-5 h-5 fill-current" viewBox="0 0 16 16" display="inline-block" overflow="visible" style={{ verticalAlign: 'text-bottom' }}>
              <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"></path>
            </svg>
          </button>
        </header>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col w-full h-full max-w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
