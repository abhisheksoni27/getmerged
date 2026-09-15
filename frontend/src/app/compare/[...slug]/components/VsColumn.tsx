import React from "react";
import Link from "next/link";
import { Repo } from "@/types/opendoor";
import {
  GitPullRequest,
  Clock,
  Users,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { formatHours, formatPercent } from "../lib/compareInsights";

interface VsColumnProps {
  repo: Repo;
  firstTimerRate: number | null | undefined;
}

export function VsColumn({ repo, firstTimerRate }: VsColumnProps) {
  return (
    <div className="rounded-3xl border border-white/[0.08] glass-panel p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="text-xs font-mono glass-card text-zinc-300 px-2.5 py-1 rounded-lg font-bold">
            {repo.language || "Multi-language"}
          </span>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            {repo.c_rank_tier || repo.class_rank || "A"} Tier ({(repo.c_rank_score || 0).toFixed(0)}%)
          </span>
        </div>
        <h2 className="font-space text-xl font-bold text-white mb-1">
          <Link prefetch={false}
            href={`/${repo.full_name}`}
            title={`View full scorecard for ${repo.full_name}`}
            className="hover:text-emerald-400 transition-colors"
          >
            {repo.full_name}
          </Link>
        </h2>
        <p className="text-xs text-zinc-400 line-clamp-2 mb-6">{repo.description || "No description provided."}</p>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
            <span className="text-zinc-400 flex items-center gap-1.5"><GitPullRequest className="h-3.5 w-3.5 text-blue-400" /> External PR Merge Rate</span>
            <strong className="text-white font-bold">{formatPercent(repo.external_pr_merge_rate)}</strong>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
            <span className="text-zinc-400 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-400" /> Review Latency (p50)</span>
            <strong className="text-white font-bold">{formatHours(repo.response_p50_hours || repo.time_to_first_response_hours)}</strong>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
            <span className="text-zinc-400 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-emerald-400" /> First-Timer Acceptance</span>
            <strong className="text-white font-bold">{formatPercent(firstTimerRate ?? repo.first_timer_success_rate)}</strong>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
            <span className="text-zinc-400 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-purple-400" /> 90-Day Bus Factor</span>
            <strong className="text-white font-bold">{repo.bus_factor ?? repo.distinct_maintainer_count ?? 1} Maintainers</strong>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
            <span className="text-zinc-400 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-emerald-400" /> Onboarding Readiness</span>
            <strong className="text-white font-bold">{repo.onboarding_score || 0}/100</strong>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/[0.08]">
        <Link prefetch={false}
          href={`/${repo.full_name}`}
          title={`Open full ${repo.full_name} scorecard`}
          className="w-full py-2.5 rounded-xl glass-card hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
        >
          View Full Scorecard <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
