import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
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
    <Layout>
      <div className="max-w-2xl w-full mx-auto pb-12">
        <button 
          onClick={() => navigate(-1)} 
          className="group flex items-center gap-2.5 text-gray-400 hover:text-white text-sm font-medium mb-6 md:mb-8 transition-colors w-fit"
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/50 border border-gray-800/80 group-hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </div>
          Back
        </button>
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Create new pipeline</h1>

        <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Pipeline name *</label>
            <input
              type="text"
              placeholder="my-awesome-app"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-gray-950/50 border border-gray-700/80 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition shadow-inner"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">GitHub repository URL *</label>
            <input
              type="text"
              placeholder="https://github.com/username/repo"
              value={form.repo}
              onChange={(e) => setForm({ ...form, repo: e.target.value })}
              className="w-full bg-gray-950/50 border border-gray-700/80 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition shadow-inner"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Branch</label>
            <input
              type="text"
              placeholder="main"
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
              className="w-full bg-gray-950/50 border border-gray-700/80 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition shadow-inner"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700/40 rounded-xl px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 py-3 mt-4 rounded-xl font-semibold transition shadow-sm"
          >
            {loading ? "Creating..." : "Create pipeline →"}
          </button>
        </div>
      </div>
    </Layout>
  );
}
