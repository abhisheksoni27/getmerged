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
}: RepoScorecardsProps) {
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
        <div className="group relative glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Response Velocity</span>
            </div>
            <Info className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-zinc-100 font-mono tracking-tight">{responseTimeStr}</div>
          <div className="text-xs text-zinc-400 mt-1 font-sans leading-relaxed">{responseCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900/95 backdrop-blur-md text-zinc-200 text-xs rounded-xl border border-white/[0.1] opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none shadow-xl">
            <p className="font-semibold text-white mb-1">Average Response Latency</p>
            <p className="text-zinc-400">Tracks hours until a maintainer leaves a review, comment, or PR response.</p>
          </div>
        </div>

        {/* Merge Efficiency */}
        <div className="group relative glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-blue-400 shrink-0" />
              <span>Merge Efficiency</span>
            </div>
            <Info className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-zinc-100 font-mono tracking-tight">{mergeRateStr}</div>
          <div className="text-xs text-zinc-400 mt-1 font-sans leading-relaxed">{mergeCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900/95 backdrop-blur-md text-zinc-200 text-xs rounded-xl border border-white/[0.1] opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none shadow-xl">
            <p className="font-semibold text-white mb-1">External Acceptance Rate</p>
            <p className="text-zinc-400">Percentage of community pull requests successfully merged into main.</p>
          </div>
        </div>

        {/* First-Timer Success */}
        <div className="group relative glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>First-Timer Success</span>
            </div>
            <Info className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-zinc-100 font-mono tracking-tight">{firstTimerSuccessStr}</div>
          <div className="text-xs text-zinc-400 mt-1 font-sans leading-relaxed">{firstTimerCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900/95 backdrop-blur-md text-zinc-200 text-xs rounded-xl border border-white/[0.1] opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none shadow-xl">
            <p className="font-semibold text-white mb-1">First PR Conversion</p>
            <p className="text-zinc-400">Rate at which developers submitting their first repository PR succeed.</p>
          </div>
        </div>

        {/* Active Maintainers & Bus Factor */}
        <div className="group relative glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Active Maintainers</span>
            </div>
            {busFactor === 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-full">
                CRITICAL BUS FACTOR
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-zinc-100 font-mono tracking-tight">
            {busFactor > 0 ? `${busFactor} core` : "Single maintainer"}
          </div>
          <div className="text-xs text-zinc-400 mt-1 font-sans leading-relaxed">{maintainersCommentary}</div>
        </div>
      </div>

      {/* Vibe & Health Summary Gauge */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            Diagnostic Health HUD
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricGauge label="Merge Gauge" value={mergeRateStr} percentage={mergeRateNum} tier="S" />
            <MetricGauge label="1st-Timer" value={firstTimerSuccessStr} percentage={firstTimerNum} tier="A" />
          </div>
        </div>

        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>Community Vibe</span>
          <span className="font-bold text-zinc-200">{vibeScore}/100</span>
        </div>
      </div>
    </div>
  );
}
