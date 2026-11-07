"use client";

import { TrendingUp } from "lucide-react";
import { MetricTile } from "./primitives";
import type { PRFunnel } from "./types";
import type { FunnelTileConfig } from "./report-derivations";

export function FunnelSection({
  funnel,
  tiles,
  ghostRate,
}: {
  funnel: PRFunnel;
  tiles: FunnelTileConfig[];
  ghostRate: number | null;
}) {
  const pf = funnel;
  return (
    <section className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-[var(--text-primary)] mb-4">
        <TrendingUp className="h-4 w-4 text-emerald-400" /> PR Acceptance & Drop-off Funnel
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {tiles.map((t) => (
          <MetricTile key={t.key} label={t.label} value={t.value} color={t.color} note={t.note} />
        ))}
      </div>

      {/* First-timer insight */}
      {ghostRate !== null && (
        <div className={`rounded-xl border p-3.5 ${ghostRate > 50 ? "border-rose-800/60 bg-rose-950/20" : "border-[var(--border-subtle)] bg-black/20"}`}>
          <p className="text-xs font-mono text-[var(--text-secondary)]">
            <span className="font-bold text-[var(--text-primary)]">First-Timer Journey: </span>
            {pf.first_timer_success_rate.toFixed(0)}% of newcomers get merged. Of those who don&apos;t,{" "}
            {ghostRate > 50
              ? <span className="text-rose-400 font-bold">most never return</span>
              : <span className="text-amber-300">some return but struggle to close</span>
            }. {ghostRate > 50
              ? "Consider a welcome bot and explicit \"good first issue\" labeling to reduce ghost rate."
              : "Your newcomer conversion is solid - focus on improving the merge timeline."
            }
          </p>
        </div>
      )}
    </section>
  );
}
