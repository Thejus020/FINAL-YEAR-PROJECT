import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
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
    <Layout>
      <div className="flex flex-col h-full max-w-6xl mx-auto w-full pb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-white text-sm mb-6 transition w-fit"
        >
          ← Back
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {build?.pipeline?.name || "Build"} <span className="text-gray-500">#{id.slice(-6)}</span>
            </h1>
            <div className="text-gray-500 text-sm mt-1 whitespace-normal md:truncate">
              <span className="font-medium bg-gray-900 px-2 py-0.5 rounded-md">{build?.triggeredBy === "webhook" ? "🔗 Webhook" : "👤 Manual"}</span>
              {build?.duration ? <span className="ml-2 font-mono text-xs border-l border-gray-700 pl-2">{formatDuration(build.duration)}</span> : ""}
            </div>
          </div>
          
          <div className="flex items-center gap-4 self-start md:self-auto">
            <span className={`text-xs px-3 py-1.5 rounded-md font-medium border ${statusBadge[status].replace('text-', 'border-').replace('bg-', 'border-').replace('/20', '/40')} ${statusBadge[status]}`}>
              {status}
            </span>
            {streaming && (
              <span className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-900/10 border border-violet-900/30 px-3 py-1.5 rounded-md">
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
                streaming
              </span>
            )}
          </div>
        </div>

        {/* Terminal window */}
        <div className="flex-1 min-h-[50vh] bg-[#0d1117] border border-gray-800/80 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
          {/* macOS-style chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-gray-800">
            <span className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="ml-4 text-xs text-gray-500 font-mono">infraflow build log</span>
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-auto p-4 md:p-6 font-mono text-xs md:text-sm space-y-1.5">
            {logs.length === 0 && (
              <span className="text-gray-600 italic">Waiting for build to start...</span>
            )}
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-3 hover:bg-gray-800/30 rounded px-1 -mx-1 ${levelColor[log.level] || "text-gray-300"}`}>
                <span className="text-gray-600 select-none w-16 md:w-20 shrink-0 text-[10px] md:text-xs pt-0.5 opacity-60">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                </span>
                <span className="break-words whitespace-pre-wrap flex-1">{log.message}</span>
              </div>
            ))}
            {streaming && (
              <div className="flex gap-3 text-gray-500">
                <span className="w-16 md:w-20 shrink-0" />
                <span className="animate-pulse">█</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Status footer */}
        {!streaming && (
          <div
            className={`mt-6 rounded-2xl px-6 py-4 text-sm font-medium border backdrop-blur-sm shadow-sm ${
              status === "success"
                ? "bg-green-900/20 border-green-700/30 text-green-400"
                : "bg-red-900/20 border-red-700/30 text-red-400"
            }`}
          >
            {status === "success"
              ? "✅ Build completed successfully"
              : "❌ Build failed — check the terminal logs above"}
          </div>
        )}
      </div>
    </Layout>
  );
}
