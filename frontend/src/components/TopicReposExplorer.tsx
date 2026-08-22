"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Sparkles, Filter, BarChart3 } from "lucide-react";
import type { Repo } from "@/types/opendoor";
import { canonicalizeSlug, displayNameFromSlug } from "@/lib/languageSlug";

interface TopicReposExplorerProps {
  topic: string;
  repos: Repo[];
}

const chipClass = (active: boolean): string =>
  `inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-medium transition-all border cursor-pointer ${
    active
      ? "bg-zinc-900 text-white border-zinc-900"
      : "bg-white text-zinc-600 border-zinc-300 hover:border-emerald-500 hover:text-emerald-800"
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
          <span className="text-xs font-mono text-zinc-500 mr-1 flex items-center gap-1">
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
          <span className="text-xs font-mono text-zinc-500 mr-1 flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" /> Rankings
          </span>
          {languages.map(({ lang }) => (
            <Link
              key={lang}
              href={`/rankings/${canonicalizeSlug(lang)}`}
              title={`View ${displayNameFromSlug(lang)} rankings for the same topic`}
              className="inline-flex items-center gap-1 text-xs font-mono text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              /rankings/{canonicalizeSlug(lang)}
            </Link>
          ))}
        </div>
      </section>

      <p className="text-xs font-mono text-zinc-500 mb-3" aria-live="polite">
        {selectedLang === "all"
          ? `${filteredRepos.length} repositories tagged #${topic}`
          : `${filteredRepos.length} of ${repos.length} repositories · ${selectedLang}`}
      </p>

      <div className="space-y-4">
        {filteredRepos.map((repo) => (
          <div
            key={repo.id}
            className="p-5 rounded-2xl border border-zinc-200/80 bg-white hover:border-emerald-500/80 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  {repo.c_rank_tier || repo.class_rank || "A"} Tier
                </span>
                <span className="text-xs font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md font-medium">
                  {repo.language || "Multi-language"}
                </span>
                {(repo.good_first_issue_count ?? 0) > 0 && (
                  <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-emerald-200/60">
                    <Sparkles className="h-3 w-3" /> {repo.good_first_issue_count} GFIs
                  </span>
                )}
              </div>
              <h2 className="font-space text-lg font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                <Link
                  href={`/${repo.full_name}`}
                  title={`View contributor metrics for ${repo.full_name}`}
                  className="hover:underline flex items-center gap-1.5"
                >
                  {repo.full_name}
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                </Link>
              </h2>
              {repo.description && (
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                  {repo.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs font-mono text-zinc-500 flex-wrap">
                <span>
                  Merge Rate: <strong className="text-zinc-900">{(repo.external_pr_merge_rate || 0).toFixed(1)}%</strong>
                </span>
                <span>
                  Response: <strong className="text-zinc-900">{(repo.response_p50_hours || repo.time_to_first_response_hours || 0).toFixed(1)}h</strong>
                </span>
                <span>
                  Maintainers: <strong className="text-zinc-900">{repo.bus_factor ?? 0} active</strong>
                </span>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-center">
              <Link
                href={`/${repo.full_name}`}
                title={`Open full scorecard for ${repo.full_name}`}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs"
              >
                View Scorecard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}