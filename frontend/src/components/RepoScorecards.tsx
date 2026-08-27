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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Response Velocity */}
        <div className="group relative border border-slate-800 bg-[#111827] p-5 rounded-md transition-all hover:border-slate-600">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Response Velocity</span>
            </div>
            <Info className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-slate-100 font-mono tracking-tight">{responseTimeStr}</div>
          <div className="text-xs text-slate-400 mt-1 font-sans">{responseCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-120 pointer-events-none shadow-lg">
            <p className="font-bold mb-1">Average Response Latency</p>
            <p className="text-slate-300">Tracks hours until a maintainer leaves a review, comment, or PR response.</p>
          </div>
        </div>

        {/* Merge Efficiency */}
        <div className="group relative border border-slate-800 bg-[#111827] p-5 rounded-md transition-all hover:border-slate-600">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-blue-400 shrink-0" />
              <span>Merge Efficiency</span>
            </div>
            <Info className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-slate-100 font-mono tracking-tight">{mergeRateStr}</div>
          <div className="text-xs text-slate-400 mt-1 font-sans">{mergeCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-120 pointer-events-none shadow-lg">
            <p className="font-bold mb-1">External Acceptance Rate</p>
            <p className="text-slate-300">Percentage of community pull requests successfully merged into main.</p>
          </div>
        </div>

        {/* First-Timer Success */}
        <div className="group relative border border-slate-800 bg-[#111827] p-5 rounded-md transition-all hover:border-slate-600">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>First-Timer Success</span>
            </div>
            <Info className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-slate-100 font-mono tracking-tight">{firstTimerSuccessStr}</div>
          <div className="text-xs text-slate-400 mt-1 font-sans">{firstTimerCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-120 pointer-events-none shadow-lg">
            <p className="font-bold mb-1">First PR Conversion</p>
            <p className="text-slate-300">Rate at which developers submitting their first repository PR succeed.</p>
          </div>
        </div>

        {/* Active Maintainers & Bus Factor */}
        <div className="group relative border border-slate-800 bg-[#111827] p-5 rounded-md transition-all hover:border-slate-600">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Active Maintainers</span>
            </div>
            {busFactor === 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono bg-red-950 text-red-400 border border-red-800 rounded">
                CRITICAL BUS FACTOR
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-slate-100 font-mono tracking-tight">
            {busFactor > 0 ? `${busFactor} core` : "Single point of failure"}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-sans">{maintainersCommentary}</div>
        </div>
      </div>

      {/* Vibe & Health Summary Gauge */}
      <div className="border border-slate-800 bg-[#111827] p-6 rounded-md flex flex-col justify-between">
        <div>
          <div className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Diagnostic Health Reading
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricGauge label="Merge Gauge" value={mergeRateStr} percentage={mergeRateNum} tier="S" />
            <MetricGauge label="1st-Timer" value={firstTimerSuccessStr} percentage={firstTimerNum} tier="A" />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Community Vibe</span>
          <span className="font-bold text-slate-200">{vibeScore}/100</span>
        </div>
      </div>
    </div>
  );
}
