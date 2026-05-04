import { useState, useEffect, useRef, useMemo } from "react";
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

  // Determine current step based on logs
  const currentStepIndex = useMemo(() => {
    if (status === "queued") return 0;
    if (status === "success") return 4;
    
    const logsStr = logs.map(l => l.message).join("\\n");
    if (logsStr.includes("Running build") || logsStr.includes("npm run build")) return 3;
    if (logsStr.includes("Running install") || logsStr.includes("npm ci")) return 2;
    if (logsStr.includes("Cloning repository")) return 1;
    return 0; // Setup
  }, [logs, status]);

  const steps = [
    { label: "Setup environment", desc: "Provisioning runner" },
    { label: "Checkout", desc: "Cloning repository code" },
    { label: "Install dependencies", desc: "Running npm ci" },
    { label: "Build project", desc: "Running build script" },
    { label: "Complete", desc: "Finalizing execution" }
  ];

  return (
    <Layout>
      <div className="flex flex-col h-full max-w-6xl mx-auto w-full pb-8">
        {/* Header */}
                  <><svg className="w-3.5 h-3.5 mr-1 opacity-70" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>Manual</>
                )}
              </span>
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

        {/* Main Interface */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-[50vh]">
          {/* Build Steps Sidebar */}
          <div className="w-full md:w-64 shrink-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Build Steps
            </h2>
            <div className="space-y-6">
              {steps.map((step, idx) => {
                const isActive = idx === currentStepIndex && status === "running";
                const isCompleted = idx < currentStepIndex || status === "success";
                const isFailed = idx === currentStepIndex && status === "failed";
                const isPending = idx > currentStepIndex && status !== "failed";

                return (
                  <div key={idx} className="relative flex gap-4">
                    {/* Vertical line connector */}
                    {idx < steps.length - 1 && (
                      <div className={`absolute top-6 left-3 w-px h-full -ml-px ${isCompleted ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/10'}`} />
                    )}
                    
                    {/* Status icon */}
                    <div className="relative z-10 shrink-0 mt-1">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                        </div>
                      ) : isActive ? (
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                        </div>
                      ) : isFailed ? (
                        <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                          <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-black/40 border border-white/10" />
                      )}
                    </div>
                    
                    {/* Step details */}
                    <div className="flex-1 pb-2">
                      <div className={`text-sm font-bold ${isCompleted || isActive ? 'text-slate-200' : isFailed ? 'text-rose-400' : 'text-slate-500'}`}>
                        {step.label}
                      </div>
                      <div className={`text-xs mt-1 font-medium ${isActive ? 'text-cyan-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]' : 'text-slate-600'}`}>
                        {isActive ? 'In progress...' : isFailed ? 'Failed at this step' : step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terminal window */}
          <div className="flex-1 bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.6)] h-[600px] md:h-auto">
            {/* macOS-style chrome */}
            <div className="flex items-center justify-between px-5 py-4 bg-white/5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-rose-500 rounded-full" />
                <span className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="w-3 h-3 bg-emerald-500 rounded-full" />
              </div>
              <span className="text-xs text-slate-400 font-mono font-bold tracking-wider">infraflow build log</span>
              <button 
                className="text-xs font-bold text-slate-500 hover:text-cyan-400 transition-colors"
                onClick={() => {
                  const logText = logs.map(l => l.message).join('\\n');
                  navigator.clipboard.writeText(logText);
                  alert('Logs copied to clipboard!');
                }}
              >
                Copy Logs
              </button>
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-auto p-4 md:p-6 font-mono text-xs md:text-sm space-y-1.5 scroll-smooth custom-scrollbar">
              {logs.length === 0 && (
                <span className="text-slate-600 italic">Waiting for build to start...</span>
              )}
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 hover:bg-white/5 rounded px-2 py-0.5 -mx-2 ${levelColor[log.level] || "text-slate-300"}`}>
                  <span className="text-slate-600 select-none w-16 md:w-20 shrink-0 text-[10px] md:text-xs pt-0.5 opacity-60 border-r border-white/5 mr-1">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                  </span>
                  <span className="break-words whitespace-pre-wrap flex-1 leading-relaxed">{log.message}</span>
                </div>
              ))}
              {streaming && (
                <div className="flex gap-3 text-cyan-500">
                  <span className="w-16 md:w-20 shrink-0 border-r border-white/5 mr-1" />
                  <span className="animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]">█</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>

        {/* Status footer */}
        {!streaming && status !== "queued" && status !== "running" && (
          <div
            className={`mt-6 rounded-2xl px-6 py-4 text-sm font-medium border backdrop-blur-sm shadow-sm ${
              status === "success"
                ? "bg-green-900/20 border-green-700/30 text-green-400"
                : "bg-red-900/20 border-red-700/30 text-red-400"
            }`}
          >
            {status === "success" ? (
              <span className="flex items-center"><svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Build completed successfully</span>
            ) : (
              <span className="flex items-center"><svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>Build failed — check the terminal logs above</span>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
