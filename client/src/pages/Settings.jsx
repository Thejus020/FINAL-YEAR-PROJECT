import { useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import API from "../config";

export default function Settings() {
  const { user, token, logout } = useAuth();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // placeholder — extend with PATCH /auth/me if needed
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Layout>
      <div className="max-w-2xl w-full mx-auto pb-12">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Settings</h1>

        {/* Profile card */}
        <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/80 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-300 mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-6">
            {user?.avatar && (
              <img src={user.avatar} alt="avatar" className="w-14 h-14 rounded-xl border-2 border-violet-600/50 shadow-sm" />
            )}
            <div className="min-w-0">
              <div className="font-bold text-lg truncate">{user?.displayName || user?.username}</div>
              <div className="text-gray-500 text-sm truncate">@{user?.username}</div>
              {user?.email && <div className="text-gray-500 text-xs mt-0.5 truncate">{user.email}</div>}
            </div>
          </div>
          <div className="text-xs text-gray-600 bg-gray-950/50 rounded-lg p-3 border border-gray-800/50">
            Connected via GitHub OAuth. Profile details are pulled from your GitHub account.
          </div>
        </div>

        {/* Jenkins config card */}
        <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/80 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-300 mb-1">Jenkins Integration</h2>
          <p className="text-gray-600 text-xs mb-4">Configure in <code className="text-violet-400 bg-violet-900/10 px-1.5 py-0.5 rounded">server/.env</code></p>
          <div className="space-y-3">
            {["JENKINS_URL", "JENKINS_USER", "JENKINS_JOB"].map((key) => (
              <div key={key} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <code className="text-violet-300 text-xs w-36 shrink-0">{key}</code>
                <div className="flex-1 bg-gray-950 border border-gray-800/80 rounded-xl px-4 py-2.5 text-gray-500 text-xs">
                  Set in .env file
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API token card */}
        <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/80 rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="font-semibold text-gray-300 mb-1">Your API Token</h2>
          <p className="text-gray-600 text-xs mb-4">Use this to authenticate API requests directly.</p>
          <div className="flex flex-col md:flex-row gap-2">
            <code className="flex-1 bg-gray-950 border border-gray-800/80 rounded-xl px-4 py-3 text-green-400 text-xs break-all opacity-80 blur-[2px] hover:blur-none transition-all duration-300 cursor-pointer">
              {token}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(token); }}
              className="md:w-32 bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-xl text-xs font-medium transition"
            >
              Copy Token
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-red-950/20 backdrop-blur-sm border border-red-900/30 rounded-2xl p-6">
          <h2 className="font-semibold text-red-500 mb-4">Danger Zone</h2>
          <button
            onClick={logout}
            className="w-full md:w-auto bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 px-6 py-2.5 rounded-xl text-sm font-medium transition"
          >
            Sign out of InfraFlow
          </button>
        </div>
      </div>
    </Layout>
  );
}
