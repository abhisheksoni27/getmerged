import React from "react";
import { Zap } from "lucide-react";
import {
  PRSizeSweetSpotData,
  formatHours,
  formatPercent,
} from "../lib/compareInsights";

interface SweetSpotCardProps {
  repoName: string;
  data: PRSizeSweetSpotData | null;
}

function SweetSpotCard({ repoName, data }: SweetSpotCardProps) {
  const hasAdvice = Boolean(data?.actionable_advice);

  return (
    <div className="rounded-2xl glass-card border border-white/[0.08] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-space text-sm font-bold text-white truncate max-w-[200px]">
          {repoName}
        </span>
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300">
          Sweet Spot: {data?.sweet_spot_threshold || "< 150 lines"}
        </span>
      </div>
      {hasAdvice && (
        <p className="text-xs text-zinc-300 mb-4 bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl leading-relaxed">
          {data?.actionable_advice}
        </p>
      )}
      <div className="space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.04]">
          <span className="text-zinc-400">Small PR (&lt;150 lines)</span>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold">{formatPercent(data?.small_pr?.merge_rate)} merge</span>
            <span className="text-zinc-400">~{formatHours(data?.small_pr?.median_merge_hours)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.04]">
          <span className="text-zinc-400">Medium PR (150–500 lines)</span>
          <div className="flex items-center gap-3">
            <span className="text-zinc-200 font-bold">{formatPercent(data?.medium_pr?.merge_rate)} merge</span>
            <span className="text-zinc-400">~{formatHours(data?.medium_pr?.median_merge_hours)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.04]">
          <span className="text-zinc-400">Large PR (&gt;500 lines)</span>
          <div className="flex items-center gap-3">
            <span className="text-rose-400 font-bold">{formatPercent(data?.large_pr?.merge_rate)} merge</span>
            <span className="text-zinc-400">~{formatHours(data?.large_pr?.median_merge_hours)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PrSizeSectionProps {
  repoNameA: string;
  repoNameB: string;
  sweetSpotA: PRSizeSweetSpotData | null;
  sweetSpotB: PRSizeSweetSpotData | null;
}

export function PrSizeSection({ repoNameA, repoNameB, sweetSpotA, sweetSpotB }: PrSizeSectionProps) {
  return (
    <section aria-label="PR Size Sweet Spot Comparison" className="mb-10 rounded-3xl border border-white/[0.08] glass-panel p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-amber-400 font-bold mb-1">
            <Zap className="h-4 w-4" /> Code Review Sweet Spot Showdown
          </div>
          <h2 className="font-space text-xl sm:text-2xl font-bold text-white">
            How PR Size Affects Merge Speed & Acceptance Odds
          </h2>
        </div>
        <span className="text-xs font-mono text-zinc-400">Lines of Code vs Approval Rate</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SweetSpotCard repoName={repoNameA} data={sweetSpotA} />
        <SweetSpotCard repoName={repoNameB} data={sweetSpotB} />
      </div>
    </section>
  );
}
