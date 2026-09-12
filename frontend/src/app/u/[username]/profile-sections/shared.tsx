import React from "react";

export const StatRow: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}> = ({ label, value, sub }) => (
  <div className="p-4 rounded border border-white/[0.1] bg-slate-800/80">
    <div className="text-xs font-mono text-zinc-400 font-bold uppercase">{label}</div>
    <div className="text-base font-bold text-white mt-1">{value}</div>
    {sub ? <div className="text-xs text-zinc-400 mt-1">{sub}</div> : null}
  </div>
);

export const SeasonStat: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => (
  <div className="rounded border border-white/[0.12] bg-slate-800/80 px-4 py-3">
    <div className="text-xs font-mono uppercase text-zinc-300">{label}</div>
    <div className="text-xl font-bold font-mono text-white mt-1">{value}</div>
  </div>
);

export const KpiCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  accent: string;
  value: React.ReactNode;
  sub: string;
}> = ({ icon, title, accent, value, sub }) => (
  <div
    className={`rounded-xl border border-white/[0.1] glass-panel p-5 shadow-sm border-t-2 ${accent}`}
  >
    <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
      {icon} {title}
    </div>
    <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-white">{value}</div>
    <div className="text-xs text-zinc-400 font-sans mt-1">{sub}</div>
  </div>
);

export const BadgeTile: React.FC<{
  icon: React.ReactNode;
  title: string;
  sub: string;
}> = ({ icon, title, sub }) => (
  <div className="p-3.5 rounded border border-white/[0.1] bg-slate-800/80 flex items-center gap-3">
    {icon}
    <div>
      <div className="font-sans font-bold text-sm text-white">{title}</div>
      <div className="text-xs text-zinc-400 font-sans">{sub}</div>
    </div>
  </div>
);

export const SectionShell: React.FC<{
  children: React.ReactNode;
  accent?: string;
}> = ({ children, accent = "border-t-slate-700" }) => (
  <div
    className={`mb-8 rounded-md glass-panel p-6 border border-white/[0.1] shadow-sm border-t-2 ${accent}`}
  >
    {children}
  </div>
);
