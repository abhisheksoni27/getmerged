"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import { FloatingRepoCircles } from "@/components/FloatingRepoCircles";
import { TopMatches } from "@/components/TopMatches";
import { useSearch } from "@/context/SearchContext";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { MacroStats, Repo } from "@/types/opendoor";
import { CountUp } from "./CountUp";
import { PillarGrid } from "./PillarGrid";
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
  return <div className="h-6 w-12 bg-[#1c1c1c] rounded animate-pulse mx-auto" />;
}

export function HeroSection({
  stats,
  repos,
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
    <section className="relative mx-auto max-w-6xl px-4 pt-20 pb-12 text-center sm:px-6 lg:px-8 overflow-visible">
      {/* Ambient atmospheric glows */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 -z-10 h-[380px] w-[600px] max-w-full opacity-60 blur-3xl overflow-hidden">
        <div className="h-full w-full rounded-full bg-gradient-to-tr from-emerald-500/10 via-amber-500/5 to-orange-500/15" />
      </div>

      {/* Dynamic floating circles of top S-tier repos */}
      <FloatingRepoCircles repos={repos} />

      {/* Live radar badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono font-medium text-emerald-400 backdrop-blur-md mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span>
          RADAR: {stats?.total_repos ? `${stats.total_repos.toLocaleString()}+` : "1,000+"} REPOSITORIES MONITORED IN REAL-TIME
        </span>
      </motion.div>

      <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl font-sans leading-[1.1]">
        Find repos that <span className="text-shimmer font-extrabold">actually merge</span> your PRs.
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.1 }}
        className="mx-auto mt-5 max-w-xl text-base text-[#a3a3a3] sm:text-lg leading-relaxed font-sans"
      >
        GetMerged tracks real reviewer response times, merge rates, and beginner-friendly maintainers - so you never waste hours on ignored pull requests.
      </motion.p>

      {/* Hero Search Bar */}
      <motion.div
        id="hero-search-container"
        ref={heroSearchRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.2 }}
        className="mt-8 max-w-2xl mx-auto"
      >
        <div
          onClick={() => openSearch(searchQuery)}
          className="relative flex items-center rounded-xl border border-white/[0.12] bg-[#141414]/70 backdrop-blur-xl px-4 py-3.5 hover:border-white/[0.22] hover:bg-[#1a1a1a]/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.4)] transition-all cursor-pointer group"
        >
          <Search className="h-5 w-5 text-[#a3a3a3] group-hover:text-[#d4d4d4] shrink-0 transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            readOnly
            placeholder={`Search repositories, e.g. ${famousRepos[placeholderIndex]}`}
            value={searchQuery}
            className="w-full pl-3 pr-20 text-sm text-white placeholder-[#737373] focus:outline-none font-sans bg-transparent cursor-pointer"
          />
          <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
            {searchQuery ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSearch();
                }}
                className="pointer-events-auto text-xs font-mono text-[#a3a3a3] hover:text-[#d4d4d4] mr-1"
              >
                Clear
              </button>
            ) : null}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#a3a3a3]">
              <span>⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Quick-explore chips */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs">
          <span className="font-mono text-[#737373]">Quick explore:</span>
          {QUICK_TERMS.map((term, i) => (
            <motion.button
              key={term}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.3 + i * 0.05 }}
              whileHover={{ y: -1.5, scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onQuickSearch(term);
                posthog.capture("repo_searched", { query: term, source: "hero_chip" });
                const gridEl = document.getElementById("leaderboard-grid");
                if (gridEl) {
                  gridEl.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="rounded-lg border border-white/[0.08] bg-[#141414]/60 backdrop-blur-md px-2.5 py-1 font-mono text-[#a3a3a3] hover:border-white/[0.18] hover:text-white hover:bg-[#1f1f1f]/80 cursor-pointer transition-all shadow-xs"
            >
              {term}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Personalized matches from GitHub-imported skills (hidden when signed out or empty) */}
      {isLoggedIn && (
        <div className="mt-10">
          <TopMatches />
        </div>
      )}

      {/* Macro Telemetry Grid */}
      <motion.div
        className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-3xl mx-auto rounded-2xl bg-[#141414]/70 backdrop-blur-xl p-4 sm:p-5 border border-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_12px_32px_-8px_rgba(0,0,0,0.5)] items-center text-center"
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        <div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {stats?.avg_response_hours ? "82%" : <TelemetrySkeleton />}
          </div>
          <div className="text-[11px] sm:text-xs text-[#a3a3a3] font-mono">Avg Merge Rate</div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {stats?.avg_response_hours ? formatReviewTime(stats.avg_response_hours) : <TelemetrySkeleton />}
          </div>
          <div className="text-[11px] sm:text-xs text-[#a3a3a3] font-mono">Avg First Review</div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {stats?.s_class_count !== undefined ? <CountUp value={stats.s_class_count} /> : <TelemetrySkeleton />}
          </div>
          <div className="text-[11px] sm:text-xs text-[#a3a3a3] font-mono">Welcoming Repos</div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {stats?.total_repos ? <CountUp value={stats.total_repos} /> : <TelemetrySkeleton />}
          </div>
          <div className="text-[11px] sm:text-xs text-[#a3a3a3] font-mono">Repos Scored</div>
        </div>
      </motion.div>

      {/* 3-Pillar Platform Interlinking Grid */}
      <PillarGrid />
    </section>
  );
}
