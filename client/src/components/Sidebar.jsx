import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { label: "Dashboard", icon: "🏠", to: "/dashboard" },
  { label: "New Pipeline", icon: "➕", to: "/pipeline/new" },
  { label: "Settings", icon: "⚙️", to: "/settings" },
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
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 h-full md:relative transform transition-transform duration-300 ease-in-out bg-gray-950/95 md:bg-gray-950 backdrop-blur-2xl border-r border-gray-800/80 shadow-2xl md:shadow-none
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Header / Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/80">
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            InfraFlow
          </span>
          <button 
            className="md:hidden text-gray-400 hover:text-white p-1 rounded-md"
            onClick={() => setMobileOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-200 ${
                pathname === item.to
                  ? "bg-violet-600/15 text-violet-300 border border-violet-500/20 shadow-inner"
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-white border border-transparent"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t border-gray-800/80 px-5 py-5 bg-gradient-to-t from-gray-900/50 to-transparent">
          {user && (
            <div className="flex items-center gap-3 mb-4">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-9 h-9 rounded-full border-2 border-gray-700/50 shadow-sm"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-gray-200 truncate">{user.username}</span>
                <span className="text-xs text-gray-500 truncate">GitHub user</span>
              </div>
            </div>
          )}
          <button
            onClick={() => { logout(); setMobileOpen(false); }}
            className="w-full flex items-center justify-center gap-2 bg-gray-800/40 hover:bg-red-500/10 border border-gray-700/50 hover:border-red-500/30 text-gray-400 hover:text-red-400 py-2.5 rounded-lg text-xs font-medium transition duration-200"
          >
            <span>🚪</span> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
