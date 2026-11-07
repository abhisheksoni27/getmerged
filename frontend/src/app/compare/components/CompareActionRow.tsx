"use client";

import React from "react";
import { Scale, ArrowRight, CheckCircle2 } from "lucide-react";
import { SelectedRepo } from "./compareTypes";

interface CompareActionRowProps {
  repoA: SelectedRepo | null;
  repoB: SelectedRepo | null;
  onCompare: () => void;
}

export function CompareActionRow({ repoA, repoB, onCompare }: CompareActionRowProps) {
  const isReady = repoA !== null && repoB !== null;

  return (
    <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-xs font-mono text-[var(--text-secondary)] text-center sm:text-left">
        {isReady && repoA && repoB ? (
          <span className="text-[#0D9668] font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Ready to compare {repoA.full_name} vs {repoB.full_name}
          </span>
        ) : (
          <span>Select two repositories to unlock comprehensive side-by-side scorecard</span>
        )}
      </div>

      <button
        type="button"
        disabled={!isReady}
        onClick={onCompare}
        className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold font-sans text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
          isReady
            ? "bg-[var(--brand-terracotta)] text-white hover:bg-[var(--brand-terracotta)]/90 shadow-md active:scale-[0.98]"
            : "bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-subtle)]"
        }`}
      >
        <Scale className="h-4 w-4" />
        <span>Compare Repositories</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
