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
  const [recentBuilds, setRecentBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const [pipeRes, buildRes] = await Promise.all([
        fetch(`${API}/pipelines`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/builds`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (!pipeRes.ok) throw new Error("Failed to fetch");
      const pipeData = await pipeRes.json();
      setPipelines(pipeData);
      
      if (buildRes.ok) {
        const buildData = await buildRes.json();
        setRecentBuilds(buildData);
      }
    } catch {
      setError("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
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
      <div className="flex flex-col lg:flex-row gap-8 pb-8">
        {/* Main Content: My Pipelines */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-8">
            <h1 className="text-3xl font-black bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-sm">My Pipelines</h1>
            <button
              onClick={() => navigate("/pipeline/new")}
              className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:scale-105"
            >
              + New Pipeline
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total", value: total, color: "text-slate-100", bg: "bg-white/5", shadow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" },
              { label: "Running", value: running, color: "text-cyan-400", bg: "bg-cyan-500/10", shadow: "shadow-[inset_0_1px_0_rgba(6,182,212,0.2)]" },
              { label: "Success", value: success, color: "text-indigo-400", bg: "bg-indigo-500/10", shadow: "shadow-[inset_0_1px_0_rgba(99,102,241,0.2)]" },
              { label: "Failed", value: failed, color: "text-rose-400", bg: "bg-rose-500/10", shadow: "shadow-[inset_0_1px_0_rgba(244,63,94,0.2)]" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} border border-white/10 rounded-[1.5rem] p-5 backdrop-blur-xl ${s.shadow} transition-all hover:bg-white/10 hover:-translate-y-1`}>
                <div className={`text-4xl font-black ${s.color} drop-shadow-md`}>{s.value}</div>
                <div className="text-slate-400 text-sm mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Pipeline list */}
          {loading ? (
            <div className="text-gray-500 mt-12 text-center">Loading pipelines...</div>
          ) : error ? (
            <div className="text-red-400 mt-12 text-center">{error}</div>
          ) : pipelines.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-gray-500 bg-gray-900/10 border border-gray-800/40 border-dashed rounded-2xl p-12 text-center shadow-inner mt-8">
              <div className="w-16 h-16 mb-5 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800/60 shadow-sm">
                <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
              </div>
              <h3 className="text-gray-300 font-medium text-lg mb-2">No pipelines found</h3>
              <p className="text-sm max-w-sm mb-6">You haven't connected any repositories yet. Create a pipeline to automate your deployments.</p>
              <button
                onClick={() => navigate("/pipeline/new")}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-medium transition shadow-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Create Pipeline
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pipelines.map((p) => (
                <div
                  key={p._id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-white/10 transition-all duration-300 shadow-lg group hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                >
                  <div
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => navigate(`/pipeline/${p._id}`)}
                  >
                    <div className="font-bold text-xl truncate flex items-center gap-3 text-slate-100">
                      {p.name}
                      <span className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold border ${statusColor[p.status].replace('text-', 'border-').replace('bg-', 'border-').replace('/20', '/40')} ${statusColor[p.status]}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-sm mt-1 flex items-center gap-2 truncate">
                      <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                      {p.repo} <span className="text-slate-600">·</span> <span className="text-cyan-400 font-medium">{p.branch}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 self-end md:self-auto mt-2 md:mt-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => handleRun(p._id)}
                      disabled={p.status === "running"}
                      className="bg-white/10 hover:bg-white/20 border border-white/10 disabled:opacity-40 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                      ▶ Run
                    </button>

                    <button
                      onClick={() => handleDelete(p._id)}
                      className="bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Recent Activity */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 sticky top-8 shadow-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Recent Activity
            </h2>
            
            {recentBuilds.length === 0 && !loading ? (
              <p className="text-sm text-slate-500 italic">No recent activity.</p>
            ) : (
              <div className="space-y-5">
                {recentBuilds.map((build) => (
                  <div 
                    key={build._id} 
                    onClick={() => navigate(`/build/${build._id}`)}
                    className="flex gap-3 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mt-1 ${
                        build.status === 'success' ? 'bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 
                        build.status === 'failed' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 
                        build.status === 'running' ? 'bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-slate-500'
                      }`} />
                      <div className="w-px h-full bg-white/10 my-1 group-last:hidden" />
                    </div>
                    <div className="pb-3 min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-200 truncate group-hover:text-cyan-400 transition-colors">
                        {build.pipeline?.name || 'Deleted Pipeline'}
                      </p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-slate-500 truncate font-medium">
                          Triggered by {build.triggeredBy}
                        </span>
                        <span className="text-[10px] text-slate-600 shrink-0 ml-2 font-mono">
                          {new Date(build.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
