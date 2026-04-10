import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import API from "../config";
import { useAuth } from "../context/AuthContext";

const statusColor = {
  idle: "bg-gray-700 text-gray-300",
  running: "bg-yellow-500/20 text-yellow-300",
  success: "bg-green-500/20 text-green-300",
  failed: "bg-red-500/20 text-red-300",
};

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPipelines = async () => {
    try {
      const res = await fetch(`${API}/pipelines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPipelines(data);
    } catch {
      setError("Could not load pipelines.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
    const interval = setInterval(fetchPipelines, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRun = async (pipelineId) => {
    try {
      const res = await fetch(`${API}/pipelines/${pipelineId}/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      navigate(`/build/${data.build._id}`);
    } catch {
      alert("Failed to trigger build");
    }
  };

  const handleDelete = async (pipelineId) => {
    if (!confirm("Delete this pipeline and all its builds?")) return;
    await fetch(`${API}/pipelines/${pipelineId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setPipelines((prev) => prev.filter((p) => p._id !== pipelineId));
  };

  const total = pipelines.length;
  const running = pipelines.filter((p) => p.status === "running").length;
  const success = pipelines.filter((p) => p.status === "success").length;
  const failed = pipelines.filter((p) => p.status === "failed").length;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={() => navigate("/pipeline/new")}
            className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + New Pipeline
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total", value: total, color: "text-white", bg: "bg-gray-800/40" },
            { label: "Running", value: running, color: "text-yellow-400", bg: "bg-yellow-900/10" },
            { label: "Success", value: success, color: "text-green-400", bg: "bg-green-900/10" },
            { label: "Failed", value: failed, color: "text-red-400", bg: "bg-red-900/10" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-gray-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-sm transition hover:border-gray-700/80`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-gray-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pipeline list */}
        {loading ? (
          <div className="text-gray-500 mt-12 text-center">Loading pipelines...</div>
        ) : error ? (
          <div className="text-red-400 mt-12 text-center">{error}</div>
        ) : pipelines.length === 0 ? (
          <div className="text-center mt-20 text-gray-500">
            <p className="text-lg mb-4">No pipelines yet.</p>
            <button
              onClick={() => navigate("/pipeline/new")}
              className="bg-violet-600 hover:bg-violet-700 px-6 py-3 rounded-lg font-medium transition"
            >
              Create your first pipeline →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pipelines.map((p) => (
              <div
                key={p._id}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-800/30 transition shadow-sm"
              >
                <div
                  className="flex-1 cursor-pointer min-w-0"
                  onClick={() => navigate(`/pipeline/${p._id}`)}
                >
                  <div className="font-semibold text-lg truncate flex items-center gap-2">
                    {p.name}
                    <span className={`text-xs px-2.5 py-0.5 rounded-md font-medium border ${statusColor[p.status].replace('text-', 'border-').replace('bg-', 'border-').replace('/20', '/40')} ${statusColor[p.status]}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="text-gray-500 text-sm mt-1 flex items-center gap-2 truncate">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    {p.repo} <span className="text-gray-600">·</span> <span className="text-violet-400">{p.branch}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 self-end md:self-auto mt-2 md:mt-0">
                  <button
                    onClick={() => handleRun(p._id)}
                    disabled={p.status === "running"}
                    className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
                  >
                    ▶ Run
                  </button>

                  <button
                    onClick={() => handleDelete(p._id)}
                    className="bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 hover:border-red-500/40 px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </Layout>
  );
}
