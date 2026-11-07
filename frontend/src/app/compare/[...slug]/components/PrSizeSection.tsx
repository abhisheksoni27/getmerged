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
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="font-space text-base font-bold text-[var(--text-primary)] truncate max-w-[200px]">
          {repoName}
        </span>
        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[#C4910A]">
          Sweet Spot: {data?.sweet_spot_threshold || "< 150 lines"}
        </span>
      </div>
      {hasAdvice && (
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-4 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-3 rounded-xl leading-relaxed">
          {data?.actionable_advice}
        </p>
      )}
      <div className="space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <span className="text-[var(--text-secondary)]">Small PR (&lt;150 lines)</span>
          <div className="flex items-center gap-3">
            <span className="text-[#0D9668] font-bold">{formatPercent(data?.small_pr?.merge_rate)} merge</span>
            <span className="text-[var(--text-muted)]">~{formatHours(data?.small_pr?.median_merge_hours)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <span className="text-[var(--text-secondary)]">Medium PR (150–500 lines)</span>
          <div className="flex items-center gap-3">
            <span className="text-[var(--text-primary)] font-bold">{formatPercent(data?.medium_pr?.merge_rate)} merge</span>
            <span className="text-[var(--text-muted)]">~{formatHours(data?.medium_pr?.median_merge_hours)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <span className="text-[var(--text-secondary)]">Large PR (&gt;500 lines)</span>
          <div className="flex items-center gap-3">
            <span className="text-[#C4463A] font-bold">{formatPercent(data?.large_pr?.merge_rate)} merge</span>
            <span className="text-[var(--text-muted)]">~{formatHours(data?.large_pr?.median_merge_hours)}</span>
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
    <section aria-label="PR Size Sweet Spot Comparison" className="mb-10 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#C4910A] font-bold mb-1">
            <Zap className="h-4 w-4" /> Code Review Sweet Spot Showdown
          </div>
          <h2 className="font-space text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            How PR Size Affects Merge Speed & Acceptance Odds
          </h2>
        </div>
        <span className="text-xs font-mono text-[var(--text-muted)]">Lines of Code vs Approval Rate</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SweetSpotCard repoName={repoNameA} data={sweetSpotA} />
        <SweetSpotCard repoName={repoNameB} data={sweetSpotB} />
      </div>
    </section>
  );
}
