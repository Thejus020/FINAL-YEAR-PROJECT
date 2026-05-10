import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { label: "Dashboard", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>, to: "/dashboard" },
  { label: "New Pipeline", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>, to: "/pipeline/new" },
  { label: "Infrastructure", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" /></svg>, to: "/infrastructure" },
  { label: "Settings", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.99l1.005.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>, to: "/settings" },
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 h-full md:h-[calc(100vh-3rem)] md:top-6 md:left-6 md:rounded-[2rem] transform transition-transform duration-300 ease-in-out bg-[#0f172a]/40 md:bg-white/5 backdrop-blur-2xl border-r md:border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] md:shadow-none
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Header / Logo */}
        <div className="flex items-center justify-between px-7 py-6 border-b border-white/5">
          <span className="text-2xl font-black tracking-tight bg-gradient-to-br from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
            InfraFlow
          </span>
          <button 
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
            onClick={() => setMobileOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-5 py-6 space-y-2 scrollbar-thin">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                pathname === item.to
                  ? "bg-gradient-to-r from-indigo-500/20 to-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100 border border-transparent"
              }`}
            >
              <span className={`text-base ${pathname === item.to ? "drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" : ""}`}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t border-white/5 px-6 py-6 bg-gradient-to-t from-black/20 to-transparent">
          {user && (
            <div className="flex items-center gap-3 mb-5">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-10 h-10 rounded-full border-2 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-100 truncate">{user.username}</span>
                <span className="text-[11px] text-cyan-400 uppercase tracking-widest font-semibold truncate">Pro User</span>
              </div>
            </div>
          )}
          <button
            onClick={() => { logout(); setMobileOpen(false); }}
            className="w-full flex items-center justify-center gap-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 py-3 rounded-xl text-sm font-bold transition-all duration-300"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" /></svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
