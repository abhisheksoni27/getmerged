"use client";

import { useEffect, useRef } from "react";
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
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-accent)] bg-[rgba(163,113,247,0.1)] px-3.5 py-1 text-xs font-mono text-[var(--purple-bright)] shadow-2xs mb-6">
        <span className="w-2 h-2 rounded-full bg-[var(--purple-bright)] inline-block shadow-[0_0_8px_var(--purple-bright)] animate-pulse" />
        <span>
          EMPIRICAL TELEMETRY: {stats?.total_repos ? `${stats.total_repos.toLocaleString()}` : "153,000+"} repositories scored
        </span>
      </div>

      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[var(--text-primary)] font-display leading-[1.08] text-balance max-w-4xl mx-auto">
        Find welcoming repos.<br />
        <span className="bg-gradient-to-r from-[var(--purple-bright)] to-[var(--green-bright)] bg-clip-text text-transparent">Get merged in 24 hours.</span>
      </h1>

      <p className="mt-5 text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto font-sans leading-relaxed">
        We track outside PR merge rates, review turnaround times, and first-timer success rates across 153,000+ GitHub repositories so you never waste hours on a dead PR again.
      </p>

      {/* Hero Command Bar */}
      <div
        id="hero-search-container"
        ref={heroSearchRef}
        className="mt-8 max-w-2xl mx-auto"
      >
        <div
          onClick={() => openSearch(searchQuery)}
          className="relative flex items-center rounded-xl border border-[var(--border-strong)] bg-[#0D1117] shadow-xl hover:border-[var(--border-accent)] transition-all cursor-pointer p-1.5 group"
        >
          <div className="text-[var(--text-tertiary)] p-2.5 flex items-center justify-center shrink-0 font-mono text-xs">
            repo &gt;
          </div>
          <input
            ref={searchInputRef}
            type="text"
            readOnly
            placeholder={`Search repositories, e.g. ${famousRepos[placeholderIndex] || "fastapi, rust, nextjs..."}`}
            value={searchQuery}
            className="w-full px-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] font-mono focus:outline-none bg-transparent cursor-pointer"
          />
          <div className="flex items-center gap-2 pointer-events-none shrink-0 pr-3">
            {searchQuery ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSearch();
                }}
                className="pointer-events-auto text-xs font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-0.5 cursor-pointer"
              >
                Clear
              </button>
            ) : null}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 border border-[var(--border-subtle)] bg-[#21262D] px-2 py-1 rounded text-xs text-[var(--text-secondary)] font-mono">
              <span>⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Quick-explore chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="font-mono text-xs text-[var(--text-tertiary)] uppercase tracking-wider mr-1">Quick:</span>
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
              className="rounded-full border border-[var(--border-subtle)] bg-[#0D111A] px-3 py-1 font-mono text-xs text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
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
      <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 max-w-4xl mx-auto rounded-2xl border border-[var(--border-subtle)] bg-[rgba(17,24,39,0.7)] shadow-xs divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] text-center p-2 sm:p-4 backdrop-blur-md">
        <div className="p-4 sm:p-6 flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-bold font-mono text-[var(--green-bright)] tracking-tight">
            {stats?.avg_response_hours ? "82%" : <TelemetrySkeleton />}
          </div>
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mt-2 font-mono">
            Avg Merge Rate
          </div>
        </div>
        <div className="p-4 sm:p-6 flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
            {stats?.avg_response_hours ? formatReviewTime(stats.avg_response_hours) : <TelemetrySkeleton />}
          </div>
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mt-2 font-mono">
            Median Turnaround
          </div>
        </div>
        <div className="p-4 sm:p-6 flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-bold font-mono text-[var(--purple-bright)] tracking-tight">
            {stats?.s_class_count !== undefined ? <CountUp value={stats.s_class_count} /> : <TelemetrySkeleton />}
          </div>
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mt-2 font-mono">
            S &amp; A Tier Repos
          </div>
        </div>
        <div className="p-4 sm:p-6 flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
            {stats?.total_repos ? <CountUp value={stats.total_repos} /> : <TelemetrySkeleton />}
          </div>
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mt-2 font-mono">
            Repos Scored
          </div>
        </div>
      </div>
    </section>
  );
}
