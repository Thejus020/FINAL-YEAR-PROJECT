import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import API from "../config";
import { useAuth } from "../context/AuthContext";

export default function NewPipeline() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", repo: "", branch: "main" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    const { name, repo, branch } = form;
    if (!name.trim() || !repo.trim()) {
      setError("Pipeline name and repository URL are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/pipelines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, repo, branch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create pipeline");
      navigate(`/pipeline/${data._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 p-8 max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-white text-sm mb-6 transition"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold mb-8">Create new pipeline</h1>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Pipeline name *</label>
            <input
              type="text"
              placeholder="my-awesome-app"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">GitHub repository URL *</label>
            <input
              type="text"
              placeholder="https://github.com/username/repo"
              value={form.repo}
              onChange={(e) => setForm({ ...form, repo: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Branch</label>
            <input
              type="text"
              placeholder="main"
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700/40 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 py-3 rounded-xl font-semibold transition"
          >
            {loading ? "Creating..." : "Create pipeline →"}
          </button>
        </div>
      </main>
    </div>
  );
}
