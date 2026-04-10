import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import API from "../config";
import { useAuth } from "../context/AuthContext";

const levelColor = {
  info: "text-gray-300",
  success: "text-green-400",
  error: "text-red-400",
  warn: "text-yellow-400",
};

function formatDuration(ms) {
  if (!ms) return "";
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function BuildView() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [build, setBuild] = useState(null);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("queued");
  const [streaming, setStreaming] = useState(true);
  const bottomRef = useRef(null);

  // Fetch build metadata
  useEffect(() => {
    fetch(`${API}/builds/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setBuild(data);
        setStatus(data.status);
      });
  }, [id]);

  // Connect to SSE stream
  useEffect(() => {
    const evtSource = new EventSource(`${API}/stream/builds/${id}?token=${token}`);

    evtSource.onmessage = (e) => {
      const parsed = JSON.parse(e.data);
      if (parsed.type === "log") {
        setLogs((prev) => [...prev, parsed]);
      } else if (parsed.type === "done") {
        setStatus(parsed.status);
        setStreaming(false);
        evtSource.close();
        // Refresh build metadata for duration
        fetch(`${API}/builds/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json())
          .then(setBuild);
      }
    };

    evtSource.onerror = () => {
      setStreaming(false);
      evtSource.close();
    };

    return () => evtSource.close();
  }, [id, token]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const statusBadge = {
    queued: "bg-gray-700 text-gray-300",
    running: "bg-yellow-500/20 text-yellow-300",
    success: "bg-green-500/20 text-green-300",
    failed: "bg-red-500/20 text-red-300",
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 p-8 flex flex-col">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-white text-sm mb-6 transition w-fit"
        >
          ← Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {build?.pipeline?.name || "Build"} — #{id.slice(-6)}
            </h1>
            <div className="text-gray-500 text-sm mt-0.5">
              {build?.triggeredBy === "webhook" ? "🔗 Triggered by webhook" : "👤 Manually triggered"}
              {build?.duration ? ` · ${formatDuration(build.duration)}` : ""}
            </div>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${statusBadge[status]}`}>
            {status}
          </span>
          {streaming && (
            <span className="flex items-center gap-1.5 text-xs text-violet-400">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              streaming
            </span>
          )}
        </div>

        {/* Terminal window */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
          {/* macOS-style chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/60 border-b border-gray-700/50">
            <span className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="ml-4 text-xs text-gray-500 font-mono">infraflow build log</span>
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-5 font-mono text-sm space-y-1 max-h-[60vh]">
            {logs.length === 0 && (
              <span className="text-gray-600">Waiting for build to start...</span>
            )}
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-3 ${levelColor[log.level] || "text-gray-300"}`}>
                <span className="text-gray-600 select-none w-20 shrink-0 text-xs pt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="break-all">{log.message}</span>
              </div>
            ))}
            {streaming && (
              <div className="flex gap-3 text-gray-500">
                <span className="text-gray-700 w-20 shrink-0 text-xs" />
                <span className="animate-pulse">█</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Status footer */}
        {!streaming && (
          <div
            className={`mt-4 rounded-xl px-5 py-3 text-sm font-medium ${
              status === "success"
                ? "bg-green-900/30 border border-green-700/30 text-green-300"
                : "bg-red-900/30 border border-red-700/30 text-red-300"
            }`}
          >
            {status === "success"
              ? "✅ Build completed successfully"
              : "❌ Build failed — check the logs above"}
          </div>
        )}
      </main>
    </div>
  );
}
