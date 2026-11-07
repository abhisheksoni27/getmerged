"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Layers, Sparkles } from "lucide-react";
import { FlattenedIssue, StackRepoInfo, tierBadgeStyle } from "./stackTypes";

export function IssueList({ issues }: { issues: FlattenedIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold font-space text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <span>Good First Issues in Your Tech Stack</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Open beginner issues in the exact packages and libraries your code runs on.
          </p>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
          {issues.length} opportunities
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="p-5 rounded-2xl glass-panel border border-[var(--border-subtle)] hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400 truncate">
                  {issue.repo}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Tier {issue.tier} • {issue.merge_rate}% Merge
                </span>
              </div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-emerald-300 transition-colors line-clamp-2">
                {issue.title}
              </h4>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs">
              <span className="text-[var(--text-secondary)] font-mono text-[11px]">
                💬 {issue.comments} comments
              </span>
              <a
                href={issue.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 group-hover:underline"
              >
                <span>Solve This Issue</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DependencyGrid({ dependencies }: { dependencies: StackRepoInfo[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold font-space text-[var(--text-primary)] flex items-center gap-2">
          <Layers className="h-5 w-5 text-emerald-400" />
          <span>All Detected Dependencies</span>
        </h3>
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {dependencies.length} packages
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dependencies.map((dep) => (
          <div
            key={dep.package_name}
            className="p-4 rounded-xl glass-card border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-bold font-mono text-[var(--text-primary)] truncate">
                  {dep.package_name}
                </div>
                {dep.repo_full_name && (
                  <Link prefetch={false}
                    href={`/repo/${dep.repo_full_name}`}
                    className="text-[11px] font-mono text-[var(--text-secondary)] hover:text-emerald-400 truncate block"
                  >
                    {dep.repo_full_name}
                  </Link>
                )}
              </div>

              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${tierBadgeStyle(dep.c_rank_tier)}`}
              >
                {dep.c_rank_tier === "UNKNOWN" ? "Unranked" : `Tier ${dep.c_rank_tier}`}
              </span>
            </div>

            {dep.c_rank_tier !== "UNKNOWN" ? (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)]">
                <div>
                  <span className="block text-[10px] text-zinc-500">Merge Rate</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {dep.external_pr_merge_rate}%
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-500">First Review</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {dep.time_to_first_response_hours}h
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-500">Bus Factor</span>
                  <span
                    className={`font-bold ${
                      dep.bus_factor <= 1 ? "text-amber-400" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {dep.bus_factor} reviewer{dep.bus_factor === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-zinc-500 font-mono pt-2 border-t border-[var(--border-subtle)]">
                Not yet indexed in top C-Rank repository graph
              </div>
            )}

            {dep.good_first_issues_count > 0 && (
              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-emerald-400">
                <span>{dep.good_first_issues_count} Good First Issue(s)</span>
                {dep.repo_full_name && (
                  <Link prefetch={false}
                    href={`/repo/${dep.repo_full_name}`}
                    className="hover:underline flex items-center gap-1"
                  >
                    <span>View</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
