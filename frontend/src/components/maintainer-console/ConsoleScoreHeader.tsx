"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { TierBadge } from "./FormField";

interface ConsoleScoreHeaderProps {
  score: number;
  tier: string;
}

export function ConsoleScoreHeader({ score, tier }: ConsoleScoreHeaderProps) {
  return (
    <div className="p-5 glass-card text-[var(--text-primary)] rounded-3xl border border-[var(--border-subtle)] shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div>
        <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">Current Health Score</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl font-extrabold text-[var(--text-primary)]">{Math.round(score)}</span>
          <span className="text-[var(--text-secondary)] text-sm">/100</span>
          <TierBadge tier={tier} />
        </div>
      </div>

      <div className="text-right">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/40">
          <ShieldCheck className="w-4 h-4" /> Verified Maintainer
        </span>
      </div>
    </div>
  );
}
