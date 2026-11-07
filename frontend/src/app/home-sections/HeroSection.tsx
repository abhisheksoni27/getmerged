"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import { TopMatches } from "@/components/TopMatches";
import { useSearch } from "@/context/SearchContext";
import { EASE_OUT_EXPO } from "@/lib/motion";
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
    <section className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-8 text-center overflow-visible">
      {/* Live radar badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
        className="inline-flex items-center gap-2 rounded-full border border-[#0D9668]/20 bg-[#0D9668]/10 px-3.5 py-1 text-xs font-mono font-semibold text-[#0D9668] mb-6"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0D9668] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0D9668]" />
        </span>
        <span>
          RADAR: {stats?.total_repos ? `${stats.total_repos.toLocaleString()}+` : "100,000+"} REPOSITORIES INDEXED
        </span>
      </motion.div>

      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)] font-display leading-[1.12] text-balance">
        Find repos that <span className="text-[var(--color-primary)] font-extrabold">actually merge</span> your PRs.
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.08 }}
        className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-sans font-normal text-balance"
      >
        Real reviewer response times, merge rates, and beginner-friendly maintainers across 102,000+ open-source projects.
      </motion.p>

      {/* Hero Search Bar - Prominent Silicon Valley Card */}
      <motion.div
        id="hero-search-container"
        ref={heroSearchRef}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.15 }}
        className="mt-8 max-w-2xl mx-auto"
      >
        <div
          onClick={() => openSearch(searchQuery)}
          className="relative flex items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[var(--border-hover)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all cursor-pointer group"
        >
          <Search className="h-5 w-5 text-[var(--text-tertiary)] group-hover:text-[var(--color-primary)] shrink-0 transition-colors mr-3" />
          <input
            ref={searchInputRef}
            type="text"
            readOnly
            placeholder={`Search repositories, e.g. ${famousRepos[placeholderIndex] || "react, rust, fastify..."}`}
            value={searchQuery}
            className="w-full text-base sm:text-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none font-sans bg-transparent cursor-pointer"
          />
          <div className="flex items-center gap-2 pointer-events-none shrink-0 ml-2">
            {searchQuery ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSearch();
                }}
                className="pointer-events-auto text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] mr-1 cursor-pointer"
              >
                Clear
              </button>
            ) : null}
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-xs font-medium text-[var(--text-secondary)]">
              <span>⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Quick-explore chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="font-mono text-[var(--text-tertiary)] font-medium">Quick explore:</span>
          {QUICK_TERMS.map((term, i) => (
            <motion.button
              key={term}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO, delay: 0.25 + i * 0.04 }}
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                onQuickSearch(term);
                posthog.capture("repo_searched", { query: term, source: "hero_chip" });
                const gridEl = document.getElementById("leaderboard-grid");
                if (gridEl) {
                  gridEl.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-1 text-xs font-mono font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] cursor-pointer transition-all shadow-2xs"
            >
              {term}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Personalized matches from GitHub-imported skills (hidden when signed out or empty) */}
      {isLoggedIn && (
        <div className="mt-12">
          <TopMatches />
        </div>
      )}

      {/* Macro Telemetry Grid - Expansive White Surface */}
      <motion.div
        className="mt-8 sm:mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-4xl mx-auto rounded-2xl bg-[var(--bg-surface)] p-4 sm:p-6 border border-[var(--border-subtle)] shadow-xs items-center text-center"
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        <div className="p-2">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
            {stats?.avg_response_hours ? "82%" : <TelemetrySkeleton />}
          </div>
          <div className="text-xs font-mono text-[var(--text-tertiary)] uppercase tracking-wider mt-1 font-semibold">
            Avg Merge Rate
          </div>
        </div>
        <div className="p-2">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
            {stats?.avg_response_hours ? formatReviewTime(stats.avg_response_hours) : <TelemetrySkeleton />}
          </div>
          <div className="text-xs font-mono text-[var(--text-tertiary)] uppercase tracking-wider mt-1 font-semibold">
            Avg First Review
          </div>
        </div>
        <div className="p-2">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
            {stats?.s_class_count !== undefined ? <CountUp value={stats.s_class_count} /> : <TelemetrySkeleton />}
          </div>
          <div className="text-xs font-mono text-[var(--text-tertiary)] uppercase tracking-wider mt-1 font-semibold">
            Welcoming Repos
          </div>
        </div>
        <div className="p-2">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
            {stats?.total_repos ? <CountUp value={stats.total_repos} /> : <TelemetrySkeleton />}
          </div>
          <div className="text-xs font-mono text-[var(--text-tertiary)] uppercase tracking-wider mt-1 font-semibold">
            Repos Scored
          </div>
        </div>
      </motion.div>
    </section>
  );
}
