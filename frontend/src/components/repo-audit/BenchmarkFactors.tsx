"use client";

import { Sparkles } from "lucide-react";
import { fmtNum } from "./primitives";
import type { AuditFactor } from "./types";
import { impactBadgeClass, statusBadgeClass } from "./report-derivations";

export function BenchmarkFactors({ factors }: { factors: AuditFactor[] }) {
  return (
    <section className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-[var(--text-primary)] mb-4">
        <Sparkles className="h-4 w-4 text-indigo-400" /> 10-Dimension Ecosystem Benchmark (500+ Peers)
      </h2>
      <div className="space-y-3">
        {factors.map((f) => (
          <div key={f.key} className="rounded-xl border border-[var(--border-subtle)] p-3.5 bg-black/30">
            <div className="flex items-center justify-between text-xs font-mono mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text-primary)] text-sm">{f.label}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${impactBadgeClass(f.impact_level)}`}>
                  {f.impact_level} Impact
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(f.status)}`}>
                  {f.status}
                </span>
                <span className="text-sky-400 font-bold font-mono">
                  {f.peer_percentile.toFixed(0)}th percentile
                </span>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden mb-2">
              <div
                className={`h-full ${
                  f.peer_percentile >= 75 ? "bg-emerald-500" : f.peer_percentile >= 40 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${Math.max(5, Math.min(100, f.peer_percentile))}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] font-mono text-[var(--text-secondary)]">
              <span>Observed value: {fmtNum(f.raw_value)}</span>
              {f.simulated_uplift > 0 ? (
                <span className="text-emerald-400 font-bold font-mono">
                  Potential uplift: +{f.simulated_uplift.toFixed(1)} pts
                </span>
              ) : (
                <span className="text-[var(--text-tertiary)]">Operating at target</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
