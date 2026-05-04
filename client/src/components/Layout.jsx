import { useState } from "react";
import Sidebar from "./Sidebar";
import JesterAI from "./JesterAI";

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden text-slate-200">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full relative md:pl-[304px] md:pt-6">
        {/* Mobile Header with Hamburger */}
        <header className="md:hidden flex items-center p-4 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
          <button 
            onClick={() => setMobileOpen(true)}
            className="p-2 mr-3 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition bg-white/5 border border-white/10"
          >
            <svg aria-hidden="true" focusable="false" className="w-5 h-5 fill-current" viewBox="0 0 16 16" display="inline-block" overflow="visible" style={{ verticalAlign: 'text-bottom' }}>
              <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"></path>
            </svg>
          </button>
          <span className="text-xl font-black bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            InfraFlow
          </span>
        </header>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col w-full h-full max-w-full">
          {children}
        </div>
      </div>
      
      <JesterAI />
    </div>
  );
}
