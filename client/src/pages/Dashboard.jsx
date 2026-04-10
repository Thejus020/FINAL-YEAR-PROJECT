import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
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
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 p-8">
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
            { label: "Total", value: total, color: "text-white" },
            { label: "Running", value: running, color: "text-yellow-400" },
            { label: "Success", value: success, color: "text-green-400" },
            { label: "Failed", value: failed, color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
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
                className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-gray-600 transition"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(`/pipeline/${p._id}`)}
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-gray-500 text-sm mt-0.5">{p.repo} · {p.branch}</div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[p.status]}`}>
                  {p.status}
                </span>
                <button
                  onClick={() => handleRun(p._id)}
                  disabled={p.status === "running"}
                  className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 px-3 py-1.5 rounded-lg text-sm transition"
                >
                  ▶ Run
                </button>
                <button
                  onClick={() => handleDelete(p._id)}
                  className="text-gray-600 hover:text-red-400 px-2 py-1.5 rounded-lg text-sm transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
