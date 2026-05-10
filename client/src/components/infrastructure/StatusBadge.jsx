const statusConfig = {
  online: {
    color: "bg-emerald-500",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.6)]",
    text: "text-emerald-400",
    label: "Healthy",
    pulse: true,
  },
  warning: {
    color: "bg-amber-500",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.6)]",
    text: "text-amber-400",
    label: "Warning",
    pulse: true,
  },
  offline: {
    color: "bg-rose-500",
    glow: "shadow-[0_0_12px_rgba(244,63,94,0.6)]",
    text: "text-rose-400",
    label: "Offline",
    pulse: false,
  },
  deploying: {
    color: "bg-blue-500",
    glow: "shadow-[0_0_12px_rgba(59,130,246,0.6)]",
    text: "text-blue-400",
    label: "Deploying",
    pulse: true,
  },
  idle: {
    color: "bg-slate-500",
    glow: "shadow-[0_0_8px_rgba(100,116,139,0.4)]",
    text: "text-slate-400",
    label: "Idle",
    pulse: false,
  },
};

export default function StatusBadge({ status, size = "sm" }) {
  const config = statusConfig[status] || statusConfig.idle;
  const dotSize = size === "lg" ? "w-3 h-3" : "w-2 h-2";

  return (
    <span className={`inline-flex items-center gap-1.5 ${config.text}`}>
      <span className="relative flex">
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.color} opacity-50 animate-ping`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full ${dotSize} ${config.color} ${config.glow}`}
        />
      </span>
      <span className="text-xs font-bold uppercase tracking-wider">
        {config.label}
      </span>
    </span>
  );
}
