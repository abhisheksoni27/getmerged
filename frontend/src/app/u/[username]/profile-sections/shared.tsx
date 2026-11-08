import React from "react";

export const StatRow: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}> = ({ label, value, sub }) => (
  <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
    <div className="text-xs font-mono text-[var(--text-secondary)] font-bold uppercase">{label}</div>
    <div className="text-base font-bold text-[var(--text-primary)] mt-1">{value}</div>
    {sub ? <div className="text-xs text-[var(--text-secondary)] mt-1">{sub}</div> : null}
  </div>
);

export const SeasonStat: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => (
  <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
    <div className="text-xs font-mono uppercase text-[var(--text-secondary)]">{label}</div>
    <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1">{value}</div>
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
    className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-xs border-t-2 ${accent}`}
  >
    <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
      {icon} {title}
    </div>
    <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-[var(--text-primary)]">{value}</div>
    <div className="text-xs text-[var(--text-secondary)] font-sans mt-1">{sub}</div>
  </div>
);

export const BadgeTile: React.FC<{
  icon: React.ReactNode;
  title: string;
  sub: string;
}> = ({ icon, title, sub }) => (
  <div className="p-3.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center gap-3">
    {icon}
    <div>
      <div className="font-sans font-bold text-sm text-[var(--text-primary)]">{title}</div>
      <div className="text-xs text-[var(--text-secondary)] font-sans">{sub}</div>
    </div>
  </div>
);

export const SectionShell: React.FC<{
  children: React.ReactNode;
  accent?: string;
}> = ({ children, accent = "border-t-slate-700" }) => (
  <div
    className={`mb-8 rounded-md glass-panel p-6 border border-[var(--border-subtle)] shadow-sm border-t-2 ${accent}`}
  >
    {children}
  </div>
);
