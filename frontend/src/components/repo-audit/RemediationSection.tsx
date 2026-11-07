"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { PrioritizedFixList } from "./report-sections";
import type { PrioritizedFix } from "./types";

export function RemediationSection({
  fixes,
  onRegenerate,
  regenLoading,
  regenNote,
}: {
  fixes: PrioritizedFix[];
  onRegenerate?: () => void;
  regenLoading?: boolean;
  regenNote?: string | null;
}) {
  return (
    <section className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-[var(--text-primary)]">
          <Sparkles className="h-4 w-4 text-emerald-400" /> AI Remediation Punchlist
        </h2>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-[11px] font-mono font-bold text-[var(--text-secondary)] shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regenLoading ? "animate-spin" : ""}`} />
            {regenLoading ? "Regenerating…" : "Regenerate (1/day)"}
          </button>
        )}
      </div>

      {regenNote && <p className="text-[11px] text-[var(--text-secondary)] mb-3">{regenNote}</p>}

      <PrioritizedFixList fixes={fixes} />
    </section>
  );
}
