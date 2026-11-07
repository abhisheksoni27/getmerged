"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import posthog from "posthog-js";
import { TopMatches } from "@/components/TopMatches";
import { useSearch } from "@/context/SearchContext";
import { MacroStats, Repo } from "@/types/opendoor";
import { CountUp } from "./CountUp";
import { formatReviewTime } from "./useHomeData";

interface HeroSectionProps {
  stats: MacroStats | null;
  repos: Repo[];
  searchQuery: string;
  isLoggedIn: boolean;
  famousRepos: string[];
  placeholderIndex: number;
  onClearSearch: () => void;
  onQuickSearch: (term: string) => void;
}

const QUICK_TERMS = ["nextjs", "react", "rust", "bun", "fastapi"];

function TelemetrySkeleton() {
  return <div className="h-7 w-16 bg-[var(--bg-elevated)] rounded-lg animate-pulse mx-auto" />;
}

export function HeroSection({
  stats,
  searchQuery,
  isLoggedIn,
  famousRepos,
  placeholderIndex,
  onClearSearch,
  onQuickSearch,
}: HeroSectionProps) {
  const { openSearch, setHeroSearchVisible } = useSearch();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const heroSearchRef = useRef<HTMLDivElement | null>(null);

  // Manage header search trigger visibility via IntersectionObserver on #hero-search-container
  useEffect(() => {
    if (!heroSearchRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeroSearchVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(heroSearchRef.current);
    return () => {
      observer.disconnect();
      setHeroSearchVisible(false);
    };
  }, [setHeroSearchVisible]);

  return (
    <section className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16 text-center">
      {/* Live radar badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs font-mono text-zinc-600 shadow-2xs mb-6">
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
        <span>
          Telemetry active: {stats?.total_repos ? `${stats.total_repos.toLocaleString()}` : "102,000+"} repositories scored
        </span>
      </div>

      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-950 font-display leading-[1.08] text-balance max-w-4xl mx-auto">
        Stop wasting PRs.<br />
        <span className="text-emerald-600">Find active mergers.</span>
      </h1>

      <p className="mt-5 text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto font-sans leading-relaxed">
        Real reviewer response velocity, outside PR merge rates, and newcomer acceptance across 102,000+ open-source GitHub projects.
      </p>

      {/* Hero Search Bar */}
      <div
        id="hero-search-container"
        ref={heroSearchRef}
        className="mt-8 max-w-2xl mx-auto"
      >
        <div
          onClick={() => openSearch(searchQuery)}
          className="relative flex items-center rounded-xl border border-zinc-300 bg-white shadow-sm hover:border-zinc-400 hover:shadow-md transition-all cursor-pointer p-1.5 group"
        >
          <div className="text-zinc-400 p-2.5 flex items-center justify-center shrink-0">
            <Search className="h-5 w-5" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            readOnly
            placeholder={`Search repositories, e.g. ${famousRepos[placeholderIndex] || "fastapi, rust, nextjs..."}`}
            value={searchQuery}
            className="w-full px-2 text-sm text-zinc-900 placeholder:text-zinc-400 font-sans focus:outline-none bg-transparent cursor-pointer"
          />
          <div className="flex items-center gap-2 pointer-events-none shrink-0 pr-3">
            {searchQuery ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSearch();
                }}
                className="pointer-events-auto text-xs font-mono font-medium text-zinc-500 hover:text-zinc-900 px-2 py-0.5 cursor-pointer"
              >
                Clear
              </button>
            ) : null}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 border border-zinc-200 bg-zinc-50 px-2 py-1 rounded text-xs text-zinc-500 font-mono">
              <span>⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Quick-explore chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider mr-1">Quick:</span>
          {QUICK_TERMS.map((term) => (
            <button
              key={term}
              onClick={() => {
                onQuickSearch(term);
                posthog.capture("repo_searched", { query: term, source: "hero_chip" });
                const gridEl = document.getElementById("leaderboard-grid");
                if (gridEl) {
                  gridEl.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 font-mono text-xs text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              #{term}
            </button>
          ))}
        </div>
      </div>

      {/* Personalized matches from GitHub-imported skills (hidden when signed out or empty) */}
      {isLoggedIn && (
        <div className="mt-8">
          <TopMatches />
        </div>
      )}

      {/* Macro Telemetry Strip */}
      <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 max-w-4xl mx-auto rounded-2xl border border-zinc-200 bg-white shadow-xs divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 text-center p-2 sm:p-4">
        <div className="p-4 sm:p-6 flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-bold font-mono text-zinc-900 tracking-tight">
            {stats?.avg_response_hours ? "82%" : <TelemetrySkeleton />}
          </div>
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-2">
            Avg Merge Rate
          </div>
        </div>
        <div className="p-4 sm:p-6 flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-bold font-mono text-zinc-900 tracking-tight">
            {stats?.avg_response_hours ? formatReviewTime(stats.avg_response_hours) : <TelemetrySkeleton />}
          </div>
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-2">
            Median Turnaround
          </div>
        </div>
        <div className="p-4 sm:p-6 flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-bold font-mono text-zinc-900 tracking-tight">
            {stats?.s_class_count !== undefined ? <CountUp value={stats.s_class_count} /> : <TelemetrySkeleton />}
          </div>
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-2">
            S &amp; A Tier Repos
          </div>
        </div>
        <div className="p-4 sm:p-6 flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-bold font-mono text-zinc-900 tracking-tight">
            {stats?.total_repos ? <CountUp value={stats.total_repos} /> : <TelemetrySkeleton />}
          </div>
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-2">
            Repos Scored
          </div>
        </div>
      </div>
    </section>
  );
}
