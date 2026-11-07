"use client";

import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { getLanguageSlug } from "@/lib/languageSlug";
import { GoodFirstIssueItem, Repo } from "@/types/opendoor";

interface GfiSectionProps {
  repo: Repo;
  fullName: string;
  gfiList: GoodFirstIssueItem[];
  gfiTab: "all" | "paid";
  onTabChange: (tab: "all" | "paid") => void;
}

export function GfiSection({ repo, fullName, gfiList, gfiTab, onTabChange }: GfiSectionProps) {
  return (
    <section id="good-first-issues" className="scroll-mt-36 rounded-2xl glass-panel p-4 sm:p-5 mb-10 border-2 border-[var(--border-subtle)] shadow-sm font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" /> Active Good First Issues ({gfiList.length > 0 ? gfiList.length : (repo?.good_first_issue_count ?? 0)})
          </h3>
          <div className="inline-flex rounded-xl glass-card p-0.5 border border-[var(--border-subtle)] text-xs font-mono">
            <button
              type="button"
              onClick={() => onTabChange("all")}
              className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                gfiTab === "all"
                  ? "glass-panel text-[var(--text-primary)] shadow-2xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onTabChange("paid")}
              className={`px-2.5 py-1 rounded-lg transition-colors font-semibold flex items-center gap-1 ${
                gfiTab === "paid"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-[var(--text-secondary)] hover:text-emerald-400"
              }`}
            >
              <span>💰 Paid</span>
            </button>
          </div>
        </div>
        <a
          href={`https://github.com/${fullName}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2Cgood-first-issue`}
          target="_blank"
          rel="noopener noreferrer"
          title="View open good first issues on GitHub"
          className="text-xs text-emerald-600 hover:text-emerald-400 font-semibold inline-flex items-center gap-1"
        >
          View on GitHub <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {gfiList.length > 0 ? (
        <div className="space-y-3 font-sans">
          {gfiList.map((issue) => {
            const issueNumber = issue.issue_number || (typeof issue.id === "number" && issue.id > 0 ? issue.id : null);
            const issueUrl = (issue.url && new RegExp(`^https://github\\.com/${fullName}/issues/\\d+$`, "i").test(issue.url))
              ? issue.url
              : (issueNumber ? `https://github.com/${fullName}/issues/${issueNumber}` : `https://github.com/${fullName}/issues`);

            let dateStr: string | null = null;
            if (issue.created_at) {
              try {
                const d = new Date(issue.created_at);
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                dateStr = `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
              } catch {
                dateStr = null;
              }
            }

            return (
              <div
                key={issue.id}
                className="p-4 sm:p-5 rounded-lg border border-[var(--border-subtle)] glass-panel hover:border-emerald-500 hover:-translate-y-px hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {issueNumber && (
                      <span className="font-mono text-xs font-semibold text-emerald-300 bg-emerald-950/70 border-emerald-800/80 px-2 py-0.5 rounded border border-emerald-200/80">
                        #{issueNumber}
                      </span>
                    )}
                    {issue.is_bounty && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border-emerald-800/80 border border-emerald-300 text-[11px] font-mono font-bold text-emerald-300">
                        💰 {issue.bounty_amount ? `$${issue.bounty_amount.toFixed(2)}` : "Bounty"}
                      </span>
                    )}
                    {issue.boosted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/40 border border-indigo-500/20 border border-indigo-300 text-[10px] font-mono font-bold text-indigo-800">
                        🚀 Boosted
                      </span>
                    )}
                    <a
                      href={issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open #${issueNumber || ""} ${issue.title} on GitHub`}
                      className="text-sm sm:text-base font-medium text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors line-clamp-2 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 active:scale-[0.99]"
                    >
                      <span>🎯 {issue.title}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-emerald-600" />
                    </a>
                  </div>
                  {issue.body_text && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {issue.body_text}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-[var(--text-secondary)] flex-wrap">
                    {dateStr && <span suppressHydrationWarning>📅 Opened {dateStr}</span>}
                    {issue.comments_count !== undefined && (
                      <span>💬 {issue.comments_count} {issue.comments_count === 1 ? "comment" : "comments"}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  {issue.quality_score !== undefined && issue.quality_score > 0 && (
                    <span className="text-[11px] font-mono font-bold bg-emerald-950/70 border-emerald-800/80 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                      Quality: {issue.quality_score}/100
                    </span>
                  )}
                  <a
                    href={issueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Contribute to ${issue.title} on GitHub`}
                    className="px-3 py-1 rounded-lg glass-card hover:bg-zinc-800 text-[var(--text-primary)] font-bold text-xs inline-flex items-center gap-1 transition-all active:scale-[0.99]"
                  >
                    Contribute <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card/60 border border-[var(--border-subtle)] rounded-lg p-6 text-center text-[var(--text-secondary)] font-sans">
          <p className="text-xs text-[var(--text-secondary)]">
            {gfiTab === "paid" ? (
              <>No cash-bounty issues currently open for <strong>{fullName}</strong>.</>
            ) : repo?.good_first_issue_count ? (
              <>
                This repository currently has <strong>{repo.good_first_issue_count}</strong> open{" "}
                <code className="bg-emerald-950/70 border-emerald-800/80 px-1.5 py-0.5 rounded text-emerald-400 font-mono">good first issue</code> tickets available for newcomers.
              </>
            ) : (
              <>No cached good first issues currently tracked for <strong>{fullName}</strong>.</>
            )}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            <a
              href={`https://github.com/${fullName}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2Cgood-first-issue`}
              target="_blank"
              rel="noopener noreferrer"
              title="View all good first issues directly on GitHub"
              className="text-emerald-600 hover:text-emerald-400 font-semibold inline-flex items-center gap-1 underline underline-offset-2"
            >
              View all good first issues directly on GitHub <ArrowRight className="h-3 w-3 inline" />
            </a>
          </p>
        </div>
      )}

      {repo?.language && (
        <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between font-sans">
          <span className="text-[11px] text-[var(--text-secondary)]">Looking for more {repo.language} beginner tasks?</span>
          <Link prefetch={false}
            href={`/good-first-issue/${getLanguageSlug(repo.language)}`}
            title={`Explore all ${repo.language} Good First Issues on GetMerged`}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 hover:underline"
          >
            Explore {repo.language} GFI <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </section>
  );
}
