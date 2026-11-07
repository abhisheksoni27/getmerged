"use client";

import { Download } from "lucide-react";
import type { AuditReport } from "./types";
import type { VitalItem } from "./report-derivations";
import { VitalsGrid } from "./VitalsGrid";
import type { AuditFactor } from "./types";
import { Target } from "lucide-react";

export function SummaryHeader({
  report,
  vitals,
  onDownload,
}: {
  report: AuditReport;
  vitals: VitalItem[];
  onDownload: () => void;
}) {
  const r = report;
  const rh = r.reviewer_health;
  return (
    <section className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-block rounded-full bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 font-mono text-xs font-bold text-emerald-300">
              ✓ Maintainer Intelligence Report
            </span>
            {r.overall.potential_uplift_pts && r.overall.potential_uplift_pts > 0 ? (
              <span className="inline-block rounded-full bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 font-mono text-xs font-bold text-indigo-300">
                +{r.overall.potential_uplift_pts.toFixed(1)} pts potential
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-[var(--text-primary)]">{r.repo.full_name}</h1>
          {r.repo.description && <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">{r.repo.description}</p>}

          {/* Quick vitals inline */}
          {rh && <VitalsGrid vitals={vitals} />}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400">{r.overall.score.toFixed(1)}</div>
            <div className="text-xs font-mono text-[var(--text-secondary)] font-semibold">C-Rank™ · Tier {r.overall.tier}</div>
          </div>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-[var(--border-subtle)] px-4 py-2.5 text-xs font-mono font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-sm"
            title="Download standalone offline HTML report"
          >
            <Download className="h-4 w-4 text-sky-400" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export function TopPrioritySignal({ factor }: { factor: AuditFactor | undefined }) {
  if (!factor) return null;
  const topBottleneck = factor;
  return (
    <section className="rounded-2xl border-2 border-amber-500/30 bg-amber-950/20 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-500/30">
          <Target className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <p className="text-xs font-mono font-bold text-amber-300 mb-0.5">Top Priority This Week</p>
          <p className="text-sm font-mono text-[var(--text-primary)] font-bold">{topBottleneck.label}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Currently at the <span className="text-amber-300 font-bold">{topBottleneck.peer_percentile.toFixed(0)}th percentile</span> among peers -{" "}
            {topBottleneck.simulated_uplift > 0
              ? `fixing this could add +${topBottleneck.simulated_uplift.toFixed(1)} pts to your C-Rank™`
              : `this is your biggest drag on contributor experience`}.
          </p>
        </div>
      </div>
    </section>
  );
}
