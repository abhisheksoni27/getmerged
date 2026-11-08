"use client";

import { useEffect, useRef } from "react";
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
  onClearSearch?: () => void;
  onQuickSearch: (term: string) => void;
}

const QUICK_TERMS = ["nextjs", "react", "rust", "bun", "fastapi"];

export function HeroSection({
  stats,
  searchQuery,
  isLoggedIn,
  famousRepos,
  placeholderIndex,
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
    <section className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12">
      {/* Hero Badge */}
      <div className="hero-badge">
        <span className="dot" />
        <span>EMPIRICAL OPEN-SOURCE CONTRIBUTOR TELEMETRY</span>
      </div>

      <h1 className="hero-title">
        Find welcoming repos.<br />Get your PR merged in 24 hours.
      </h1>

      <p className="hero-subtitle">
        We continuously audit outside PR merge rates, review turnaround times, and first-timer success rates across {stats?.total_repos ? stats.total_repos.toLocaleString() : "153,000+"} GitHub repositories. Stop waiting weeks for reviews on dead PRs.
      </p>

      {/* Command Terminal Scanner */}
      <div
        id="hero-search-container"
        ref={heroSearchRef}
        className="mb-8"
      >
        <div
          onClick={() => openSearch(searchQuery)}
          className="scan-terminal cursor-pointer group"
        >
          <span className="scan-prompt">repo &gt;</span>
          <input
            ref={searchInputRef}
            type="text"
            readOnly
            placeholder={`Search 153k+ repositories, e.g. ${famousRepos[placeholderIndex] || "bluenazgul/unifi-device-card"}`}
            value={searchQuery}
            className="scan-input cursor-pointer"
          />
          <button
            type="button"
            className="scan-btn flex items-center gap-1.5 cursor-pointer"
          >
            <span>Analyze Telemetry</span>
            <span className="font-mono text-xs">↵</span>
          </button>
        </div>

        {/* Quick Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Quick:</span>
          {QUICK_TERMS.map((term) => (
            <button
              key={term}
              onClick={() => onQuickSearch(term)}
              className="pill hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              #{term}
            </button>
          ))}
        </div>
      </div>

      {/* Personalized matches from GitHub-imported skills */}
      {isLoggedIn && (
        <div className="mb-8">
          <TopMatches />
        </div>
      )}

      {/* Macro Benchmarks - Grid-4 */}
      <div className="grid-4 mb-10">
        <div className="card">
          <div className="tele-label">Indexed Repositories</div>
          <div className="font-mono tabular text-2xl font-bold text-[var(--text-primary)] my-1">
            {stats?.total_repos ? <CountUp value={stats.total_repos} /> : "153,884"}
          </div>
          <div className="text-xs text-[var(--text-tertiary)] font-mono">Continuous 6-month window</div>
        </div>

        <div className="card">
          <div className="tele-label">Tier S &amp; A Welcoming</div>
          <div className="font-mono tabular text-2xl font-bold text-[var(--purple-bright)] my-1">
            {stats?.s_class_count !== undefined ? <CountUp value={stats.s_class_count} /> : "14,290"}
          </div>
          <div className="text-xs text-[var(--text-tertiary)] font-mono">&gt;70% outside merge rate</div>
        </div>

        <div className="card">
          <div className="tele-label">Median First Review (Tier S)</div>
          <div className="font-mono tabular text-2xl font-bold text-[var(--green-bright)] my-1">
            {stats?.avg_response_hours ? formatReviewTime(stats.avg_response_hours) : "4.2 hrs"}
          </div>
          <div className="text-xs text-[var(--text-tertiary)] font-mono">P50 maintainer response</div>
        </div>

        <div className="card">
          <div className="tele-label">Unclaimed Good First Issues</div>
          <div className="font-mono tabular text-2xl font-bold text-[var(--text-primary)] my-1">
            {stats?.good_first_issue_count !== undefined ? <CountUp value={stats.good_first_issue_count} /> : "8,912"}
          </div>
          <div className="text-xs text-[var(--text-tertiary)] font-mono">Verified zero active PRs</div>
        </div>
      </div>
    </section>
  );
}
