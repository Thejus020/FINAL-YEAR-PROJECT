import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import API, { WEBHOOK_BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";

const statusColor = {
  queued: "text-gray-400",
  running: "text-yellow-400",
  success: "text-green-400",
  failed: "text-red-400",
};

function formatDuration(ms) {
  if (!ms) return "-";
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function PipelineDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState(null);
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isEditingEnv, setIsEditingEnv] = useState(false);
  const [editEnvVars, setEditEnvVars] = useState([]);
  const [savingEnv, setSavingEnv] = useState(false);

  const fetchData = async () => {
    const [pRes, bRes] = await Promise.all([
      fetch(`${API}/pipelines/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/builds/pipeline/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (pRes.ok) setPipeline(await pRes.json());
    if (bRes.ok) setBuilds(await bRes.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${API}/pipelines/${id}/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      navigate(`/build/${data.build._id}`);
    } catch {
      alert("Failed to trigger build");
      setRunning(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this pipeline and all builds?")) return;
    await fetch(`${API}/pipelines/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    navigate("/dashboard");
  };

  const webhookUrl = `${WEBHOOK_BASE_URL}/pipelines/${id}/webhook`;
  const webhookBaseIsLocalhost = /localhost|127\.0\.0\.1/i.test(WEBHOOK_BASE_URL);

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyWebhookSecret = () => {
    if (!pipeline?.webhookSecret) return;
    navigator.clipboard.writeText(pipeline.webhookSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleEditEnvClick = () => {
    setEditEnvVars(pipeline?.envVars?.length ? [...pipeline.envVars] : [{ key: "", value: "" }]);
    setIsEditingEnv(true);
  };

  const handleSaveEnvVars = async () => {
    setSavingEnv(true);
    try {
      const filtered = editEnvVars.filter(ev => ev.key.trim() !== "");
      const res = await fetch(`${API}/pipelines/${id}/env`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ envVars: filtered }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPipeline(updated);
        setIsEditingEnv(false);
      } else {
        alert("Failed to save variables");
      }
    } catch (err) {
      alert("Error saving variables");
    } finally {
      setSavingEnv(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 text-gray-500 flex items-center justify-center">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
        <button 
          onClick={() => navigate("/dashboard")} 
          className="group flex items-center gap-2.5 text-gray-400 hover:text-white text-sm font-medium mb-6 md:mb-8 transition-colors w-fit"
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/50 border border-gray-800/80 group-hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </div>
          Dashboard
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{pipeline?.name}</h1>
            <div className="text-gray-500 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              {pipeline?.repo} · <span className="text-violet-400 font-medium">{pipeline?.branch}</span>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={handleRun}
              disabled={running || pipeline?.status === "running"}
              className="flex-1 md:flex-none bg-violet-600 hover:bg-violet-700 disabled:opacity-40 px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
            >
              {running ? "Starting..." : "▶ Run now"}
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 md:flex-none border border-gray-700/80 hover:bg-red-500/10 hover:border-red-500/50 text-gray-400 hover:text-red-400 px-5 py-2.5 rounded-xl text-sm font-medium transition"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Deployment URLs */}
        {pipeline?.deployedUrls && pipeline.deployedUrls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {pipeline.deployedUrls.map((d, idx) => (
              <a 
                key={idx}
                href={d.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex items-center justify-between bg-violet-600/10 border border-violet-500/30 hover:bg-violet-600/20 rounded-2xl p-4 transition-all shadow-sm hover:shadow-violet-500/10"
              >
                <div>
                  <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">{d.label}</div>
                  <div className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">{d.url}</div>
                </div>
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/20 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Webhook card */}
        <div className="bg-gray-900/40 backdrop-blur-md border border-gray-800/80 rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="font-semibold mb-1 text-sm text-gray-400 uppercase tracking-wider">GitHub Webhook</h2>
          {webhookBaseIsLocalhost && (
            <p className="text-amber-400 text-xs mb-3">
              This URL uses localhost and will not work from GitHub. Set{" "}
              <code className="text-amber-300">VITE_WEBHOOK_BASE_URL</code> to a public URL (ngrok/cloudflared/domain).
            </p>
          )}
          <p className="text-gray-500 text-xs mb-3">
            Add this URL in your repo → Settings → Webhooks → Payload URL. Set content type to{" "}
            <code className="text-violet-300">application/json</code> and paste the secret below into GitHub Webhook Secret.
          </p>
          <div className="flex flex-col md:flex-row gap-2">
            <code className="flex-1 bg-gray-950 border border-gray-800/80 rounded-xl px-4 py-3 text-sm text-green-300 break-all">
              {webhookUrl}
            </code>
            <button
              onClick={copyWebhook}
              className="md:w-32 bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-xl font-medium text-xs transition"
            >
              {copied ? "✓ Copied" : "Copy URL"}
            </button>
          </div>
          <div className="flex flex-col md:flex-row gap-2 mt-3">
            <code className="flex-1 bg-gray-950 border border-gray-800/80 rounded-xl px-4 py-3 text-sm text-violet-300 break-all opacity-80 blur-[2px] hover:blur-none transition-all duration-300 cursor-pointer">
              {pipeline?.webhookSecret || "No webhook secret available"}
            </code>
            <button
              onClick={copyWebhookSecret}
              className="md:w-32 bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-xl font-medium text-xs transition"
            >
              {copiedSecret ? "✓ Copied" : "Copy Secret"}
            </button>
          </div>
        </div>

        {/* Environment Variables card */}
        <div className="bg-gray-900/40 backdrop-blur-md border border-gray-800/80 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">Environment Variables</h2>
            {!isEditingEnv && (
              <button onClick={handleEditEnvClick} className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition">
                Edit Variables
              </button>
            )}
          </div>

          {isEditingEnv ? (
            <div className="space-y-3">
              {editEnvVars.map((ev, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="KEY"
                    value={ev.key}
                    onChange={(e) => {
                      const list = [...editEnvVars];
                      list[idx].key = e.target.value;
                      setEditEnvVars(list);
                    }}
                    className="flex-1 bg-gray-950/50 border border-gray-700/80 rounded-xl px-3 py-2 text-sm text-white focus:border-violet-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="VALUE"
                    value={ev.value}
                    onChange={(e) => {
                      const list = [...editEnvVars];
                      list[idx].value = e.target.value;
                      setEditEnvVars(list);
                    }}
                    className="flex-1 bg-gray-950/50 border border-gray-700/80 rounded-xl px-3 py-2 text-sm text-white focus:border-violet-500 outline-none"
                  />
                  <button onClick={() => {
                    const list = [...editEnvVars];
                    list.splice(idx, 1);
                    setEditEnvVars(list);
                  }} className="text-gray-500 hover:text-red-400 p-2">✕</button>
                </div>
              ))}
              <div className="flex items-center justify-between mt-4 pt-2 border-t border-gray-800/50">
                <button onClick={() => setEditEnvVars([...editEnvVars, { key: "", value: "" }])} className="text-xs text-violet-400 hover:text-violet-300">+ Add another</button>
                <div className="flex gap-2">
                  <button onClick={() => setIsEditingEnv(false)} className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition">Cancel</button>
                  <button onClick={handleSaveEnvVars} disabled={savingEnv} className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 rounded-xl transition">
                    {savingEnv ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {pipeline?.envVars && pipeline.envVars.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pipeline.envVars.map((ev, idx) => (
                    <div key={idx} className="flex flex-col bg-gray-950 border border-gray-800/80 rounded-xl px-4 py-2">
                      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-tighter">{ev.key}</span>
                      <span className="text-sm text-gray-300 font-mono truncate">{ev.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No environment variables configured.</p>
              )}
            </>
          )}
        </div>

        {/* Build history */}
        <h2 className="text-lg font-bold mb-4">Build History</h2>
        {builds.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-500 bg-gray-900/10 border border-gray-800/40 border-dashed rounded-2xl p-12 text-center shadow-inner">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800/60 shadow-sm">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
            </div>
            <h3 className="text-gray-300 font-medium text-base mb-1">No builds yet</h3>
            <p className="text-sm max-w-sm">Hit Run to trigger your first deployment pipeline.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {builds.map((b, i) => (
              <div
                key={b._id}
                onClick={() => navigate(`/build/${b._id}`)}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/80 hover:bg-gray-800/40 rounded-2xl px-6 py-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 cursor-pointer transition shadow-sm"
              >
                <div className="text-gray-500 font-mono text-sm w-8 shrink-0">#{builds.length - i}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    Triggered by{" "}
                    <span className="text-violet-400 bg-violet-900/20 px-2 py-0.5 rounded-md ml-1">{b.triggeredBy}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1.5 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {new Date(b.createdAt).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-6 mt-3 md:mt-0 pt-3 md:pt-0 border-t border-gray-800/80 md:border-t-0">
                  <span className={`text-sm px-3 py-1 rounded-full font-semibold bg-gray-950/50 border border-gray-800/80 ${statusColor[b.status]}`}>{b.status}</span>
                  <span className="text-gray-500 text-sm font-mono w-16 text-right">{formatDuration(b.duration)}</span>
                  <span className="text-gray-600 hidden md:block">›</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </Layout>
  );
}
