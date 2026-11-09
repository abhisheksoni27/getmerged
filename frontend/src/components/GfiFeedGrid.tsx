"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Star, ExternalLink, Zap } from "lucide-react";
import { GoodFirstIssueItem } from "@/types/opendoor";
import { ClaimIssueButton } from "@/components/ClaimIssueButton";
import { formatFreshness } from "@/lib/freshness";

interface GfiFeedGridProps {
  initialIssues: GoodFirstIssueItem[];
}

export function GfiFeedGrid({ initialIssues }: GfiFeedGridProps) {
  const [verifiedFreeOnly, setVerifiedFreeOnly] = useState(false);

  const displayedIssues = verifiedFreeOnly
    ? initialIssues.filter((iss) => iss.is_verified_free)
    : initialIssues;

  const verifiedFreeCount = initialIssues.filter((iss) => iss.is_verified_free).length;

  return (
    <div>
      {/* Feed Controls Bar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Live Available Issues ({displayedIssues.length})
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Verified Free Filter Toggle */}
          <button
            type="button"
            onClick={() => setVerifiedFreeOnly(!verifiedFreeOnly)}
            className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all border ${
              verifiedFreeOnly
                ? "bg-[rgba(163,113,247,0.18)] text-[var(--purple-bright)] border-[var(--border-accent)] shadow-xs"
                : "bg-white/[0.03] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-white/20"
            }`}
          >
            <Zap className={`h-3 w-3 ${verifiedFreeOnly ? "text-[var(--purple-bright)] fill-[var(--purple-bright)]" : "text-[var(--text-tertiary)]"}`} />
            <span>Verified Free Only</span>
            <span className="ml-0.5 px-1 py-0.2 rounded text-[10px] bg-black/30 text-[var(--text-tertiary)]">
              {verifiedFreeCount}
            </span>
          </button>

          <span className="text-xs text-[var(--text-tertiary)] font-mono hidden sm:inline">Live GitHub Sync</span>
        </div>
      </div>

      {displayedIssues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedIssues.map((iss) => {
            let parsedLabels: { name: string; color: string }[] = [];
            try {
              parsedLabels = JSON.parse(iss.labels_json || "[]");
            } catch {
              parsedLabels = [];
            }
            const tier = iss.c_rank_tier || "A";

            return (
              <div
                key={`${iss.repository_id}-${iss.issue_number}`}
                className="card p-4 sm:p-5 flex flex-col justify-between hover:border-[var(--border-accent)] transition-all group"
              >
                <div>
                  {/* Header: Repo link, Tier badge, Stars */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Link
                      prefetch={false}
                      href={`/${iss.repo_full_name}`}
                      className="font-mono text-xs font-semibold text-[var(--purple-bright)] hover:underline truncate max-w-[200px]"
                    >
                      {iss.repo_full_name}
                    </Link>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {iss.stars > 0 && (
                        <span className="pill text-[10px]">
                          <Star className="h-2.5 w-2.5 fill-[#C4910A] text-[#C4910A]" />
                          <span className="tabular">{iss.stars.toLocaleString()}</span>
                        </span>
                      )}
                      <span className={`tier-badge tier-${tier} text-[11px] h-6 w-6`}>
                        {tier}
                      </span>
                    </div>
                  </div>

                  {/* Issue Number, Freshness, & Verified Free Badge */}
                  <div className="flex items-center flex-wrap gap-2 mb-1.5 text-[11px] font-mono text-[var(--text-tertiary)]">
                    <span>#{iss.issue_number}</span>
                    <span>•</span>
                    <span className="text-[var(--green-bright)]">{formatFreshness(iss.created_at)}</span>
                    {iss.is_verified_free ? (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[rgba(130,80,223,0.15)] text-[var(--purple-bright)] border border-[rgba(163,113,247,0.3)]"
                        title={iss.verified_free_reason || "Unassigned, no linked PR, no recent claims"}
                      >
                        <Zap className="h-2.5 w-2.5 fill-current" />
                        <span>Verified Free</span>
                      </span>
                    ) : iss.has_linked_pr ? (
                      <span className="pill pill-amber text-[10px]">PR in progress</span>
                    ) : null}
                  </div>

                  {/* Issue Title */}
                  <a
                    href={iss.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--purple-bright)] transition-colors line-clamp-2 mb-2 block"
                  >
                    {iss.title}
                  </a>

                  {iss.body_text && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-3">
                      {iss.body_text}
                    </p>
                  )}

                  {/* Labels */}
                  {parsedLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {parsedLabels.slice(0, 3).map((l, idx) => (
                        <span key={idx} className="pill text-[10px]">
                          {l.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                  <ClaimIssueButton
                    issue={{
                      id: `${iss.repository_id}-${iss.issue_number}`,
                      repo_name: iss.repo_full_name,
                      issue_number: iss.issue_number,
                      title: iss.title,
                      url: iss.url,
                      c_rank_tier: iss.c_rank_tier,
                      has_linked_pr: iss.has_linked_pr,
                      linked_pr_number: iss.linked_pr_number,
                    }}
                  />

                  <a
                    href={iss.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-[var(--text-tertiary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Claim on GitHub</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-8 text-center text-sm text-[var(--text-secondary)]">
          <p className="mb-2">
            {verifiedFreeOnly
              ? "No verified-free issues found matching the active filter."
              : "No open good first issues found right now."}
          </p>
          {verifiedFreeOnly && (
            <button
              onClick={() => setVerifiedFreeOnly(false)}
              className="text-xs font-mono text-[var(--purple-bright)] hover:underline mt-1"
            >
              Reset filter to show all issues
            </button>
          )}
        </div>
      )}
    </div>
  );
}
