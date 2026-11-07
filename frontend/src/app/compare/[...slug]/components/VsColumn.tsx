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
    <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="text-xs font-mono bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] px-2.5 py-1 rounded-lg font-bold">
            {repo.language || "Multi-language"}
          </span>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#0D9668]">
            {repo.c_rank_tier || repo.class_rank || "A"} Tier ({(repo.c_rank_score || 0).toFixed(0)}%)
          </span>
        </div>
        <h2 className="font-space text-xl font-bold text-[var(--text-primary)] mb-1">
          <Link prefetch={false}
            href={`/${repo.full_name}`}
            title={`View full scorecard for ${repo.full_name}`}
            className="hover:text-[var(--brand-terracotta)] transition-colors"
          >
            {repo.full_name}
          </Link>
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2 mb-6">{repo.description || "No description provided."}</p>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><GitPullRequest className="h-3.5 w-3.5 text-blue-600" /> External PR Merge Rate</span>
            <strong className="text-[var(--text-primary)] font-bold">{formatPercent(repo.external_pr_merge_rate)}</strong>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-600" /> Review Latency (p50)</span>
            <strong className="text-[var(--text-primary)] font-bold">{formatHours(repo.response_p50_hours || repo.time_to_first_response_hours)}</strong>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-emerald-600" /> First-Timer Acceptance</span>
            <strong className="text-[var(--text-primary)] font-bold">{formatPercent(firstTimerRate ?? repo.first_timer_success_rate)}</strong>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-purple-600" /> 90-Day Bus Factor</span>
            <strong className="text-[var(--text-primary)] font-bold">{repo.bus_factor ?? repo.distinct_maintainer_count ?? 1} Maintainers</strong>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-emerald-600" /> Onboarding Readiness</span>
            <strong className="text-[var(--text-primary)] font-bold">{repo.onboarding_score || 0}/100</strong>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
        <Link prefetch={false}
          href={`/${repo.full_name}`}
          title={`Open full ${repo.full_name} scorecard`}
          className="w-full py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all"
        >
          View Full Scorecard <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
