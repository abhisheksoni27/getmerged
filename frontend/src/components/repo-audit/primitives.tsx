"use client";

export function MetricTile({
  label,
  value,
  color,
  note,
}: {
  label: string;
  value: string;
  color: "emerald" | "rose" | "sky" | "purple" | "amber";
  note?: string;
}) {
  const colorMap = {
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    sky: "text-sky-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
  };
  return (
    <div className="rounded-xl border border-white/[0.08] p-4 bg-black/40">
      <div className={`text-2xl font-bold font-mono ${colorMap[color]}`}>{value}</div>
      <div className="text-xs text-zinc-300 mt-1 font-medium">{label}</div>
      {note && <div className="text-[11px] text-zinc-500 mt-0.5">{note}</div>}
    </div>
  );
}

export function FrictionBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: "rose" | "amber" | "sky";
}) {
  const barColor = { rose: "bg-rose-500", amber: "bg-amber-500", sky: "bg-sky-500" }[color];
  const textColor = { rose: "text-rose-400", amber: "text-amber-400", sky: "text-sky-400" }[color];
  return (
    <div>
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="text-zinc-300">{label}</span>
        <span className={`${textColor} font-bold`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function fmtNum(v: number): string {
  if (v >= 100) return v.toFixed(0);
  if (v >= 1) return v.toFixed(1);
  return v.toFixed(2);
}
