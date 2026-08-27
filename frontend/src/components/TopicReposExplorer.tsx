"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  Sparkles,
  Filter,
  BarChart3,
  Star,
  Users,
  Clock,
  GitPullRequest,
} from "lucide-react";
import type { Repo } from "@/types/opendoor";
import { canonicalizeSlug, displayNameFromSlug } from "@/lib/languageSlug";
import { LangLogo } from "@/components/LangLogo";

interface TopicReposExplorerProps {
  topic: string;
  repos: Repo[];
}

const chipClass = (active: boolean): string =>
  `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border border-white/[0.12] cursor-pointer ${
    active
      ? "bg-amber-600 text-white shadow-sm"
      : "bg-zinc-900/80 text-zinc-200 hover:bg-slate-800 hover:shadow-sm"
  }`;

export function TopicReposExplorer({ topic, repos }: TopicReposExplorerProps) {
  const [selectedLang, setSelectedLang] = useState<string>("all");

  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const repo of repos) {
      const lang = (repo.language || "").trim();
      if (!lang) continue;
      counts.set(lang, (counts.get(lang) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => ({ lang, count }));
  }, [repos]);

  const filteredRepos = useMemo(
    () =>
      selectedLang === "all"
        ? repos
        : repos.filter((repo) => (repo.language || "").trim() === selectedLang),
    [repos, selectedLang]
  );

  return (
    <div>
      <section aria-label="Language filter" data-testid="language-filter" className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-zinc-300 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Filter by language
          </span>
          <button
            type="button"
            aria-pressed={selectedLang === "all"}
            onClick={() => setSelectedLang("all")}
            className={chipClass(selectedLang === "all")}
            title="Show all languages"
          >
            All ({repos.length})
          </button>
          {languages.map(({ lang, count }) => (
            <button
              key={lang}
              type="button"
              aria-pressed={selectedLang === lang}
              onClick={() => setSelectedLang(lang)}
              className={chipClass(selectedLang === lang)}
              title={`Filter to ${lang} repositories`}
            >
              {lang} ({count})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-3">
          <span className="text-xs font-mono text-zinc-300 mr-1 flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" /> Rankings
          </span>
          {languages.map(({ lang }) => (
            <Link
              key={lang}
              href={`/rankings/${canonicalizeSlug(lang)}`}
              title={`View ${displayNameFromSlug(lang)} rankings for the same topic`}
              className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              /rankings/{canonicalizeSlug(lang)}
            </Link>
          ))}
        </div>
      </section>

      <p className="text-xs font-mono text-zinc-300 mb-3" aria-live="polite">
        {selectedLang === "all"
          ? `${filteredRepos.length} repositories tagged #${topic}`
          : `${filteredRepos.length} of ${repos.length} repositories · ${selectedLang}`}
      </p>

      <div className="space-y-4">
        {filteredRepos.map((repo) => {
          const rank = repo.c_rank_tier || repo.class_rank || "A";
          const firstTimerRate =
            repo.first_timer_success_rate !== undefined && repo.first_timer_success_rate >= 0
              ? `${Math.round(repo.first_timer_success_rate)}%`
              : null;
          const starsFormatted =
            repo.stars >= 1_000 ? `${(repo.stars / 1_000).toFixed(1)}k` : repo.stars;
          const responseHours =
            repo.response_p50_hours || repo.time_to_first_response_hours || 0;
          const responseFormatted =
            responseHours > 0
              ? responseHours < 1
                ? "<1h"
                : responseHours < 24
                ? `${Math.round(responseHours)}h`
                : `${Math.round(responseHours / 24)}d`
              : "-";

          return (
            <div
              key={repo.id}
              className="dev-card-glow p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-zinc-900/80 shadow-xs hover:border-white/[0.12] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-5 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-zinc-900 text-white shadow-2xs">
                    {rank} Tier
                  </span>
                  <span className="text-xs font-mono bg-zinc-900 text-zinc-300 px-2.5 py-0.5 rounded-md font-medium border border-white/[0.08]/60 flex items-center gap-1.5">
                    <LangLogo language={repo.language} />
                    {repo.language || "Multi-language"}
                  </span>
                  <span className="text-xs font-mono bg-amber-950/70 border-amber-800/80 text-amber-300 px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1 border border-amber-200/60">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" /> {starsFormatted}
                  </span>
                  {(repo.good_first_issue_count ?? 0) > 0 && (
                    <span className="text-xs font-mono bg-emerald-950/70 border-emerald-800/80 text-emerald-300 px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1 border border-emerald-200/60">
                      <Sparkles className="h-3 w-3 text-emerald-600" /> {repo.good_first_issue_count} GFIs
                    </span>
                  )}
                </div>

                <h2 className="font-space text-lg sm:text-xl font-bold text-white group-hover:text-zinc-300 transition-colors">
                  <Link
                    href={`/${repo.full_name}`}
                    title={`View contributor metrics for ${repo.full_name}`}
                    className="hover:underline flex items-center gap-1.5"
                  >
                    {repo.full_name}
                    <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-300" />
                  </Link>
                </h2>

                {repo.description && (
                  <p className="text-xs sm:text-sm text-zinc-300 mt-1.5 line-clamp-2 leading-relaxed font-sans">
                    {repo.description}
                  </p>
                )}

                {/* Scorecard telemetry grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2.5 px-3 bg-zinc-900/90 rounded-xl border border-white/[0.08] mt-3 text-center font-mono">
                  <div>
                    <div className="text-xs font-bold text-white">{(repo.external_pr_merge_rate || 0).toFixed(1)}%</div>
                    <div className="text-[10px] text-zinc-300 font-medium whitespace-nowrap mt-0.5 flex items-center justify-center gap-1">
                      <GitPullRequest className="h-2.5 w-2.5 text-blue-500" /> Merge Rate
                    </div>
                  </div>
                  <div className="border-l border-white/[0.08] pl-2">
                    <div className="text-xs font-bold text-white">{responseFormatted}</div>
                    <div className="text-[10px] text-zinc-300 font-medium whitespace-nowrap mt-0.5 flex items-center justify-center gap-1">
                      <Clock className="h-2.5 w-2.5 text-amber-500" /> First Review
                    </div>
                  </div>
                  <div className="border-l border-white/[0.08] pl-2">
                    <div className="text-xs font-bold text-white">{firstTimerRate || "-"}</div>
                    <div className="text-[10px] text-zinc-300 font-medium whitespace-nowrap mt-0.5 flex items-center justify-center gap-1">
                      <Sparkles className="h-2.5 w-2.5 text-emerald-500" /> 1st-Timers
                    </div>
                  </div>
                  <div className="border-l border-white/[0.08] pl-2">
                    <div className="text-xs font-bold text-white">{repo.bus_factor ?? 0}</div>
                    <div className="text-[10px] text-zinc-300 font-medium whitespace-nowrap mt-0.5 flex items-center justify-center gap-1">
                      <Users className="h-2.5 w-2.5 text-purple-500" /> Maintainers
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-start sm:self-center">
                <Link
                  href={`/${repo.full_name}`}
                  title={`Open full scorecard for ${repo.full_name}`}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs"
                >
                  View Scorecard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}