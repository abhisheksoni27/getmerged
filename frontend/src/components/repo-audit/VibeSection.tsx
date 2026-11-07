"use client";

import { Heart } from "lucide-react";
import type { AuditAIInsights } from "./types";
import type { VibeScore } from "./report-derivations";

export function VibeSection({
  insights,
  scores,
}: {
  insights: AuditAIInsights;
  scores: VibeScore[];
}) {
  if (!insights.maintainer_vibe && !insights.maintainer_persona) return null;
  return (
    <section className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-[var(--text-primary)] mb-4">
        <Heart className="h-4 w-4 text-rose-400" /> Maintainer Vibe & Community Warmth
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {insights.maintainer_persona && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-black/40 p-4 sm:col-span-1">
            <p className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Persona</p>
            <p className="text-sm font-bold font-mono text-[var(--text-primary)]">{insights.maintainer_persona}</p>
          </div>
        )}
        {scores.map((s) => (
          <div key={s.key} className="rounded-xl border border-[var(--border-subtle)] bg-black/40 p-4">
            <p className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{s.label}</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold font-mono ${s.valueClass}`}>{s.value.toFixed(0)}</span>
              <span className="text-xs text-[var(--text-tertiary)]">/100</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-800 mt-2 overflow-hidden">
              <div className={`h-full ${s.barClass}`} style={{ width: `${s.value}%` }} />
            </div>
          </div>
        ))}
      </div>
      {insights.maintainer_vibe && (
        <p className="text-sm text-[var(--text-secondary)] italic border-l-2 border-emerald-500/40 pl-4">
          &ldquo;{insights.maintainer_vibe}&rdquo;
        </p>
      )}
    </section>
  );
}
