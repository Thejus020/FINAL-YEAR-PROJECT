import { Handle, Position } from "reactflow";
import StatusBadge from "./StatusBadge";

export default function InfraNodeCard({ data }) {
  return (
    <div className="relative group">
      {/* Glow effect behind the card */}
      <div
        className={`absolute -inset-1 rounded-3xl blur-md opacity-30 transition-opacity duration-500 group-hover:opacity-60 ${
          data.status === "online"
            ? "bg-emerald-500/40"
            : data.status === "warning"
            ? "bg-amber-500/40"
            : data.status === "offline"
            ? "bg-rose-500/40"
            : data.status === "deploying"
            ? "bg-blue-500/40"
            : "bg-slate-500/20"
        }`}
      />

      <div className="relative bg-[#0c1425]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-5 min-w-[180px] shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:border-white/20 transition-all duration-300">
        {/* Icon */}
        <div className="text-3xl mb-2 drop-shadow-md">{data.icon}</div>

        {/* Label */}
        <div className="text-sm font-bold text-slate-100 mb-1">{data.label}</div>

        {/* Description */}
        <div className="text-[11px] text-slate-500 font-medium mb-3">
          {data.description}
        </div>

        {/* Status badge */}
        <StatusBadge status={data.status} size="sm" />

        {/* React Flow handles */}
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2 !h-2 !bg-cyan-500/60 !border-0"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2 !bg-indigo-500/60 !border-0"
        />
      </div>
    </div>
  );
}
