"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Repo } from "@/types/opendoor";
import { getLanguageSlug } from "@/lib/languageSlug";

interface SimilarReposProps {
  relatedRepos: Repo[];
  language?: string;
}

export function SimilarRepos({ relatedRepos, language }: SimilarReposProps) {
  if (!relatedRepos || relatedRepos.length === 0) return null;

  return (
    <div className="card h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border-subtle)]">
          <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-[var(--purple-bright)]" />
            <span>Similar Welcoming {language ? `${language} ` : ""}Repos</span>
          </div>
          {language && (
            <Link
              prefetch={false}
              href={`/rankings/${getLanguageSlug(language)}`}
              className="text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
            >
              <span>All {language}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="space-y-2">
          {relatedRepos.map((relRepo) => {
            const tier = relRepo.c_rank_tier || relRepo.class_rank || "A";
            const mergeRate = relRepo.external_pr_merge_rate
              ? `${Math.round(relRepo.external_pr_merge_rate)}% merge rate`
              : "High merge rate";
            const rawResp =
              relRepo.response_p50_hours && relRepo.response_p50_hours > 0
                ? relRepo.response_p50_hours
                : relRepo.time_to_first_response_hours && relRepo.time_to_first_response_hours > 0
                ? relRepo.time_to_first_response_hours
                : undefined;

            const responseSpeed =
              rawResp !== undefined
                ? rawResp < 0.1
                  ? "<10m review"
                  : rawResp < 1
                  ? `${Math.round(rawResp * 60)}m review`
                  : `${Math.round(rawResp)}h review`
                : "Active reviews";

            return (
              <Link
                key={relRepo.id || relRepo.full_name}
                href={`/${relRepo.full_name}`}
                prefetch={false}
                className="p-3 bg-[#0D111A] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] rounded-md flex items-center justify-between transition-colors group block"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-mono text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--purple-bright)] transition-colors truncate">
                    {relRepo.full_name}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] font-mono mt-0.5">
                    {mergeRate} • {responseSpeed}
                  </div>
                </div>
                <span className={`tier-badge tier-${tier} shrink-0 text-xs`}>{tier}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] font-mono">
        Filtered strictly to Tier S &amp; A welcoming repositories.
      </div>
    </div>
  );
}
