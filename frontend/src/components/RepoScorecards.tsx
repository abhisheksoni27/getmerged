import React from "react";
import { Clock, GitMerge, ShieldCheck, Users, Info } from "lucide-react";
import { MetricGauge } from "@/components/MetricGauge";

interface RepoScorecardsProps {
  responseTimeStr: string;
  responseCommentary: string;
  mergeRateStr: string;
  mergeCommentary: string;
  firstTimerSuccessStr: string;
  firstTimerCommentary: string;
  busFactor: number;
  maintainersCommentary: string;
  vibeScore: number;
  onboardingScore?: number;
  score?: number;
  rank?: string;
}

export function RepoScorecards({
  responseTimeStr,
  responseCommentary,
  mergeRateStr,
  mergeCommentary,
  firstTimerSuccessStr,
  firstTimerCommentary,
  busFactor,
  maintainersCommentary,
  vibeScore,
  score,
  rank,
}: RepoScorecardsProps) {
  const isCappedAtB = (score ?? 0) >= 55 && rank?.toUpperCase() === "B" && busFactor <= 1;
  const parseNum = (str: string) => {
    const n = parseInt(str.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? 0 : n;
  };

  const mergeRateNum = parseNum(mergeRateStr);
  const firstTimerNum = parseNum(firstTimerSuccessStr);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Response Velocity */}
        <div className="group relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#0D9668] shrink-0" />
              <span>Response Velocity</span>
            </div>
            <Info className="h-3.5 w-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
          </div>
          <div className="text-3xl font-bold text-[var(--text-primary)] font-mono tracking-tight">{responseTimeStr}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1 font-sans leading-relaxed">{responseCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs rounded-xl border border-[var(--border-subtle)] opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none shadow-xl">
            <p className="font-semibold text-[var(--text-primary)] mb-1">Average Response Latency</p>
            <p className="text-[var(--text-secondary)]">Tracks hours until a maintainer leaves a review, comment, or PR response.</p>
          </div>
        </div>

        {/* Merge Efficiency */}
        <div className="group relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-[#2D8ABF] shrink-0" />
              <span>Merge Efficiency</span>
            </div>
            <Info className="h-3.5 w-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
          </div>
          <div className="text-3xl font-bold text-[var(--text-primary)] font-mono tracking-tight">{mergeRateStr}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1 font-sans leading-relaxed">{mergeCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs rounded-xl border border-[var(--border-subtle)] opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none shadow-xl">
            <p className="font-semibold text-[var(--text-primary)] mb-1">External Acceptance Rate</p>
            <p className="text-[var(--text-secondary)]">Percentage of community pull requests successfully merged into main.</p>
          </div>
        </div>

        {/* First-Timer Success */}
        <div className="group relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#0D9668] shrink-0" />
              <span>First-Timer Success</span>
            </div>
            <Info className="h-3.5 w-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
          </div>
          <div className="text-3xl font-bold text-[var(--text-primary)] font-mono tracking-tight">{firstTimerSuccessStr}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1 font-sans leading-relaxed">{firstTimerCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs rounded-xl border border-[var(--border-subtle)] opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none shadow-xl">
            <p className="font-semibold text-[var(--text-primary)] mb-1">First PR Conversion</p>
            <p className="text-[var(--text-secondary)]">Rate at which developers submitting their first repository PR succeed.</p>
          </div>
        </div>

        {/* Active Maintainers & Bus Factor */}
        <div className="group relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#C4910A] shrink-0" />
              <span>Active Maintainers</span>
            </div>
            {busFactor === 0 ? (
              <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-[#C4463A]/15 text-[#C4463A] border border-[#C4463A]/30 rounded-full">
                CRITICAL BUS FACTOR
              </span>
            ) : isCappedAtB ? (
              <span
                title="Single maintainer bottleneck caps project to Tier B regardless of raw score"
                className="px-2 py-0.5 text-[10px] font-bold font-mono bg-[#C4910A]/15 text-[#C4910A] border border-[#C4910A]/30 rounded-full cursor-help"
              >
                CAPS TIER AT B
              </span>
            ) : null}
          </div>
          <div className="text-3xl font-bold text-[var(--text-primary)] font-mono tracking-tight">
            {busFactor > 0 ? `${busFactor} core` : "Single maintainer"}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1 font-sans leading-relaxed">{maintainersCommentary}</div>
        </div>
      </div>

      {/* Vibe & Health Summary Gauge */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="text-xs font-mono font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Diagnostic Health HUD
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricGauge label="Merge Gauge" value={mergeRateStr} percentage={mergeRateNum} tier="S" />
            <MetricGauge label="1st-Timer" value={firstTimerSuccessStr} percentage={firstTimerNum} tier="A" />
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
          <span>Community Reviews</span>
          <span className="font-bold text-[var(--text-primary)]">
            {vibeScore > 0 ? `${vibeScore}/100 index` : "No reviews yet"}
          </span>
        </div>
      </div>
    </div>
  );
}
