import React from "react";
import { Clock, GitMerge, ShieldCheck, Users, Info } from "lucide-react";

interface RepoScorecardsProps {
  responseTimeStr: string;
  responseCommentary: string;
  mergeRateStr: string;
  mergeCommentary: string;
  firstTimerSuccessStr: string;
  firstTimerCommentary: string;
  distinctMaintainers: number;
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
  distinctMaintainers,
  maintainersCommentary,
  vibeScore,
  onboardingScore,
}: RepoScorecardsProps) {
  const radius = 54;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const vibePercentage = Math.min(100, Math.max(0, vibeScore));
  const strokeDashoffset = circumference - (vibePercentage / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-10">
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Response Velocity */}
        <div className="group relative border border-zinc-200/90 bg-white p-6 shadow-xs rounded-3xl transition-all hover:border-zinc-300 hover:shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Response Velocity</span>
            </div>
            <Info className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-zinc-900 font-mono tracking-tight">{responseTimeStr}</div>
          <div className="text-xs sm:text-sm text-zinc-600 mt-1 font-sans font-medium">{responseCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-xl shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
            <p className="font-bold mb-1">Average Response Latency</p>
            <p className="text-zinc-300">Tracks hours until a maintainer leaves a review, comment, or PR response.</p>
          </div>
        </div>

        {/* Merge Efficiency */}
        <div className="group relative border border-zinc-200/90 bg-white p-6 shadow-xs rounded-3xl transition-all hover:border-zinc-300 hover:shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Merge Efficiency</span>
            </div>
            <Info className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-zinc-900 font-mono tracking-tight">{mergeRateStr}</div>
          <div className="text-xs sm:text-sm text-zinc-600 mt-1 font-sans font-medium">{mergeCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-xl shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
            <p className="font-bold mb-1">External Acceptance Rate</p>
            <p className="text-zinc-300">Percentage of community pull requests successfully merged into main.</p>
          </div>
        </div>

        {/* First-Timer Success */}
        <div className="group relative border border-zinc-200/90 bg-white p-6 shadow-xs rounded-3xl transition-all hover:border-zinc-300 hover:shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>First-Timer Success</span>
            </div>
            <Info className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-zinc-900 font-mono tracking-tight">{firstTimerSuccessStr}</div>
          <div className="text-xs sm:text-sm text-zinc-600 mt-1 font-sans font-medium">{firstTimerCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-xl shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
            <p className="font-bold mb-1">First PR Conversion</p>
            <p className="text-zinc-300">Rate at which developers submitting their first repository PR succeed.</p>
          </div>
        </div>

        {/* Active Maintainers & Bus Factor */}
        <div className="group relative border border-zinc-200/90 bg-white p-6 shadow-xs rounded-3xl transition-all hover:border-zinc-300 hover:shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Maintainers & Bus Factor</span>
            </div>
            {distinctMaintainers <= 1 && distinctMaintainers > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200 rounded">
                BUS FACTOR: 1
              </span>
            )}
            <Info className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl sm:text-4xl font-bold text-zinc-900 font-mono tracking-tight">
              {distinctMaintainers > 0 ? distinctMaintainers : "-"}
            </div>
            {onboardingScore !== undefined && onboardingScore > 0 && (
              <span className="text-xs font-mono font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Docs: {onboardingScore}/100
              </span>
            )}
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 mt-1 font-sans font-medium">{maintainersCommentary}</div>
          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-xl shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
            <p className="font-bold mb-1">Distinct Reviewers & Docs</p>
            <p className="text-zinc-300">Active maintainers in the 90-day window and newcomer documentation readiness score.</p>
          </div>
        </div>
      </div>

      {/* Contributor Vibe Score Card */}
      <div className="border border-zinc-200/90 bg-white p-6 shadow-xs rounded-3xl flex flex-col items-center justify-between text-center transition-all hover:border-zinc-300 hover:shadow-sm">
        <div className="w-full flex justify-between items-center border-b border-zinc-100 pb-3 mb-4">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">Contributor Vibe</span>
          <span className={`px-2.5 py-0.5 text-[10px] font-bold font-mono border rounded-lg ${
            vibeScore >= 75 ? "bg-emerald-50 text-emerald-800 border-emerald-300" : vibeScore >= 50 ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-rose-50 text-rose-800 border-rose-200"
          }`}>
            {vibeScore >= 75 ? "HIGH MERGE VIBES" : vibeScore >= 50 ? "SELECTIVE" : "STEEP CURVE"}
          </span>
        </div>

        <div className="relative flex items-center justify-center w-40 h-40">
          <svg viewBox="0 0 130 130" className="w-full h-full transform -rotate-90">
            <circle cx="65" cy="65" r={radius} fill="transparent" stroke="#f4f4f5" strokeWidth={strokeWidth} />
            <circle
              cx="65" cy="65" r={radius} fill="transparent"
              stroke={vibeScore >= 75 ? "#10b981" : vibeScore >= 50 ? "#3b82f6" : "#f43f5e"}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold text-zinc-900 font-mono">
              {vibeScore}<span className="text-base font-normal text-zinc-400">/100</span>
            </span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono mt-0.5">PR Merge Index</span>
          </div>
        </div>

        <p className="text-xs text-zinc-500 font-sans mt-3 max-w-[200px] leading-tight">
          Calculated from first response latency, external PR merge rate, and first-timer success.
        </p>
      </div>
    </div>
  );
}
