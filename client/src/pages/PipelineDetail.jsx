import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
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

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-950 text-white">
        <Sidebar />
        <main className="flex-1 p-8 text-gray-500">Loading...</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 p-8">
        <button onClick={() => navigate("/dashboard")} className="text-gray-500 hover:text-white text-sm mb-6 transition">
          ← Dashboard
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">{pipeline?.name}</h1>
            <div className="text-gray-500 text-sm">
              {pipeline?.repo} · <span className="text-violet-400">{pipeline?.branch}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRun}
              disabled={running || pipeline?.status === "running"}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              {running ? "Starting..." : "▶ Run now"}
            </button>
            <button
              onClick={handleDelete}
              className="border border-gray-700 hover:border-red-500 text-gray-400 hover:text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Webhook card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
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
          <div className="flex gap-2">
            <code className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-green-300 truncate">
              {webhookUrl}
            </code>
            <button
              onClick={copyWebhook}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-xs transition"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <code className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-violet-300 truncate">
              {pipeline?.webhookSecret || "No webhook secret available"}
            </code>
            <button
              onClick={copyWebhookSecret}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-xs transition"
            >
              {copiedSecret ? "✓ Copied" : "Copy secret"}
            </button>
          </div>
        </div>

        {/* Build history */}
        <h2 className="font-semibold mb-4">Build History</h2>
        {builds.length === 0 ? (
          <div className="text-gray-600 text-sm">No builds yet. Hit Run to start your first build.</div>
        ) : (
          <div className="space-y-2">
            {builds.map((b, i) => (
              <div
                key={b._id}
                onClick={() => navigate(`/build/${b._id}`)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl px-5 py-4 flex items-center gap-4 cursor-pointer transition"
              >
                <div className="text-gray-600 text-sm w-6">#{builds.length - i}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    Triggered by{" "}
                    <span className="text-violet-400">{b.triggeredBy}</span>
                  </div>
                  <div className="text-gray-600 text-xs mt-0.5">
                    {new Date(b.createdAt).toLocaleString()}
                  </div>
                </div>
                <span className={`text-sm font-semibold ${statusColor[b.status]}`}>{b.status}</span>
                <span className="text-gray-600 text-xs">{formatDuration(b.duration)}</span>
                <span className="text-gray-600">›</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
