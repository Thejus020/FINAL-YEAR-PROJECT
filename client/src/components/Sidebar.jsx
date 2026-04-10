import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { label: "Dashboard", icon: "🏠", to: "/dashboard" },
  { label: "New Pipeline", icon: "➕", to: "/pipeline/new" },
  { label: "Settings", icon: "⚙️", to: "/settings" },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="w-56 min-h-screen bg-gray-950 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          InfraFlow
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              pathname === item.to
                ? "bg-violet-700/30 text-violet-300"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t border-gray-800 px-4 py-4">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <img
              src={user.avatar}
              alt={user.username}
              className="w-8 h-8 rounded-full border border-gray-700"
            />
            <span className="text-sm text-gray-300 truncate">{user.username}</span>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full text-left text-xs text-gray-500 hover:text-red-400 transition"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
