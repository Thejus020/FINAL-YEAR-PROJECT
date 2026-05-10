import { useState, useEffect, useCallback, useRef } from "react";
import Layout from "../components/Layout";
import API from "../config";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/infrastructure/StatusBadge";
import InfraNodeCard from "../components/infrastructure/InfraNodeCard";
import ReactFlow, { Background, Controls, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const nodeTypes = { infraNode: InfraNodeCard };

// ── Tab Button ────────────────────────────────────────────────────────────────
function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
        active
          ? "bg-gradient-to-r from-indigo-500/20 to-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, color, icon, percentage }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-6 shadow-lg hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>
          {label}
        </span>
      </div>
      <div className="text-3xl font-black text-slate-100 mb-2">
        {value}
        <span className="text-lg text-slate-500 font-medium ml-1">{unit}</span>
      </div>
      {percentage !== undefined && (
        <div className="w-full bg-white/5 rounded-full h-2 mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              percentage > 80
                ? "bg-gradient-to-r from-rose-500 to-red-500"
                : percentage > 60
                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                : "bg-gradient-to-r from-cyan-500 to-indigo-500"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Custom Chart Tooltip ──────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label: tooltipLabel }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#0c1425]/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{tooltipLabel}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  );
}

// ── Health Stat ───────────────────────────────────────────────────────────────
function HealthStat({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 font-medium mt-1">{label}</div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function InfrastructureDashboard() {
  const { token } = useAuth();
  const [tab, setTab] = useState("monitoring");

  // Monitoring state
  const [metrics, setMetrics] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [health, setHealth] = useState(null);

  // Topology state
  const [topoNodes, setTopoNodes] = useState([]);
  const [topoEdges, setTopoEdges] = useState([]);

  const sseRef = useRef(null);

  // ── SSE: Real-time metrics ──────────────────────────────────────────────────
  useEffect(() => {
    const eventSource = new EventSource(
      `${API}/stream/infrastructure?token=${token}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "metrics") {
          setMetrics(data);
          setMetricsHistory((prev) => {
            const next = [
              ...prev,
              {
                time: new Date(data.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }),
                cpu: data.cpu,
                ram: data.ram,
              },
            ];
            return next.slice(-30);
          });
        }
      } catch {}
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    sseRef.current = eventSource;
    return () => eventSource.close();
  }, [token]);

  // ── Fetch deployment health ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch(`${API}/api/infrastructure/health`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setHealth(await res.json());
      } catch {}
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [token]);

  // ── Fetch topology ──────────────────────────────────────────────────────────
  const fetchTopology = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/infrastructure/topology`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();

      // Position nodes in a nice layout
      const positions = {
        frontend: { x: 50, y: 0 },
        backend: { x: 250, y: 150 },
        database: { x: 450, y: 0 },
        cicd: { x: 50, y: 300 },
        monitoring: { x: 450, y: 300 },
      };

      const flowNodes = data.nodes.map((n) => ({
        id: n.id,
        type: "infraNode",
        position: positions[n.id] || { x: 250, y: 150 },
        data: {
          label: n.label,
          icon: n.icon,
          status: n.status,
          description: n.description,
        },
      }));

      const flowEdges = data.edges.map((e, i) => ({
        id: `edge-${i}`,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: true,
        style: { stroke: "rgba(99, 102, 241, 0.4)", strokeWidth: 2 },
        labelStyle: {
          fill: "rgba(148, 163, 184, 0.7)",
          fontSize: 10,
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: "rgba(12, 20, 37, 0.8)",
          fillOpacity: 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "rgba(99, 102, 241, 0.5)",
        },
      }));

      setTopoNodes(flowNodes);
      setTopoEdges(flowEdges);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchTopology();
    const interval = setInterval(fetchTopology, 10000);
    return () => clearInterval(interval);
  }, [fetchTopology]);

  // ── Format bytes ────────────────────────────────────────────────────────────
  const formatBytes = (bytes) => {
    if (!bytes) return "0 GB";
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + " GB";
  };

  return (
    <Layout>
      <div className="pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-sm">
              Infrastructure
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Real-time monitoring & topology visualization
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <TabButton
              active={tab === "monitoring"}
              onClick={() => setTab("monitoring")}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              }
              label="Monitoring"
            />
            <TabButton
              active={tab === "topology"}
              onClick={() => setTab("topology")}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              }
              label="Topology Map"
            />
          </div>
        </div>

        {/* ── MONITORING TAB ─────────────────────────────────────────────── */}
        {tab === "monitoring" && (
          <div className="space-y-8">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="CPU"
                value={metrics?.cpu ?? "—"}
                unit="%"
                color="text-cyan-400"
                icon="🔥"
                percentage={metrics?.cpu}
              />
              <MetricCard
                label="Memory"
                value={metrics?.ram ?? "—"}
                unit="%"
                color="text-indigo-400"
                icon="💾"
                percentage={metrics?.ram}
              />
              <MetricCard
                label="Disk"
                value={metrics?.disk ?? "—"}
                unit="%"
                color="text-purple-400"
                icon="💿"
                percentage={metrics?.disk}
              />
              <MetricCard
                label="Uptime"
                value={metrics?.uptime ?? "—"}
                unit=""
                color="text-emerald-400"
                icon="⏱️"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CPU Chart */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-6 shadow-lg">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  CPU Usage
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={metricsHistory}>
                    <defs>
                      <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="cpu" name="CPU" stroke="#06b6d4" fill="url(#cpuGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* RAM Chart */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-6 shadow-lg">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  Memory Usage
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={metricsHistory}>
                    <defs>
                      <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="ram" name="RAM" stroke="#6366f1" fill="url(#ramGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Deployment Health */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-6 shadow-lg">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Deployment Health
              </h3>

              {health ? (
                <div className="space-y-6">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
                    <HealthStat label="Total Builds" value={health.totalBuilds} color="text-slate-100" />
                    <HealthStat label="Successful" value={health.successBuilds} color="text-emerald-400" />
                    <HealthStat label="Failed" value={health.failedBuilds} color="text-rose-400" />
                    <HealthStat label="Running" value={health.runningBuilds} color="text-cyan-400" />
                    <HealthStat
                      label="Success Rate"
                      value={`${health.successRate}%`}
                      color={health.successRate >= 70 ? "text-emerald-400" : health.successRate >= 40 ? "text-amber-400" : "text-rose-400"}
                    />
                  </div>

                  {/* Last deployment */}
                  {health.lastDeployment && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">
                        Last Deployment
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-200">
                          {health.lastDeployment.pipeline}
                        </span>
                        <StatusBadge status={health.lastDeployment.status === "success" ? "online" : health.lastDeployment.status === "failed" ? "offline" : "deploying"} />
                        {health.lastDeployment.duration && (
                          <span className="text-xs text-slate-500 ml-auto">
                            {Math.round(health.lastDeployment.duration / 1000)}s
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recent deployment history */}
                  {health.deploymentHistory?.length > 0 && (
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-3">
                        Recent Deployments
                      </div>
                      <div className="space-y-2">
                        {health.deploymentHistory.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3 border border-white/5"
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                d.status === "success"
                                  ? "bg-emerald-400"
                                  : d.status === "failed"
                                  ? "bg-rose-500"
                                  : d.status === "running"
                                  ? "bg-cyan-400 animate-pulse"
                                  : "bg-slate-500"
                              }`}
                            />
                            <span className="text-sm font-bold text-slate-200 truncate flex-1">
                              {d.pipeline}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                              {d.triggeredBy}
                            </span>
                            {d.duration && (
                              <span className="text-xs text-slate-500 font-mono">
                                {Math.round(d.duration / 1000)}s
                              </span>
                            )}
                            <span className="text-[10px] text-slate-600 font-mono">
                              {new Date(d.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-sm text-center py-8">
                  Loading deployment health...
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TOPOLOGY TAB ───────────────────────────────────────────────── */}
        {tab === "topology" && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-lg overflow-hidden" style={{ height: "70vh" }}>
            <ReactFlow
              nodes={topoNodes}
              edges={topoEdges}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
              style={{ background: "transparent" }}
            >
              <Background color="rgba(255,255,255,0.03)" gap={20} />
              <Controls
                className="!bg-white/5 !border-white/10 !rounded-xl !shadow-lg [&>button]:!bg-white/10 [&>button]:!border-white/10 [&>button]:!text-slate-400 [&>button:hover]:!bg-white/20"
              />
            </ReactFlow>
          </div>
        )}
      </div>
    </Layout>
  );
}
