import { useState } from "react";
import Sidebar from "../components/Sidebar";
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
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        {/* Profile card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-300 mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-6">
            {user?.avatar && (
              <img src={user.avatar} alt="avatar" className="w-14 h-14 rounded-full border-2 border-violet-600" />
            )}
            <div>
              <div className="font-bold text-lg">{user?.displayName || user?.username}</div>
              <div className="text-gray-500 text-sm">@{user?.username}</div>
              {user?.email && <div className="text-gray-600 text-xs mt-0.5">{user.email}</div>}
            </div>
          </div>
          <div className="text-xs text-gray-600">
            Connected via GitHub OAuth. Profile details are pulled from your GitHub account.
          </div>
        </div>

        {/* Jenkins config card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-300 mb-1">Jenkins Integration</h2>
          <p className="text-gray-600 text-xs mb-4">Configure in <code className="text-violet-300">server/.env</code></p>
          <div className="space-y-3">
            {["JENKINS_URL", "JENKINS_USER", "JENKINS_JOB"].map((key) => (
              <div key={key} className="flex items-center gap-3">
                <code className="text-violet-300 text-xs w-36">{key}</code>
                <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-gray-500 text-xs">
                  Set in .env file
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API token card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold text-gray-300 mb-1">Your API Token</h2>
          <p className="text-gray-600 text-xs mb-3">Use this to authenticate API requests directly.</p>
          <div className="flex gap-2">
            <code className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-green-400 text-xs truncate">
              {token}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(token); }}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-xs transition"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-red-950/20 border border-red-800/30 rounded-2xl p-6">
          <h2 className="font-semibold text-red-400 mb-3">Danger Zone</h2>
          <button
            onClick={logout}
            className="border border-red-700 text-red-400 hover:bg-red-900/30 px-4 py-2 rounded-lg text-sm transition"
          >
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
}
