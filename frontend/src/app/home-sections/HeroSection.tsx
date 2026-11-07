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
    <section className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-12 text-center overflow-visible">
      {/* Live radar badge */}
      <div className="inline-flex items-center gap-2 border-2 border-black bg-[#FACC15] px-3.5 py-1 text-xs font-mono font-black text-black shadow-[2px_2px_0px_0px_#000] uppercase mb-6">
        <span className="w-2.5 h-2.5 bg-black inline-block animate-pulse" />
        <span>
          TELEMETRY ACTIVE: {stats?.total_repos ? `${stats.total_repos.toLocaleString()}` : "102,000+"} REPOSITORIES INDEXED
        </span>
      </div>

      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-black font-display uppercase leading-[0.95] text-balance">
        STOP WASTING PRS.<br />
        <span className="bg-[#10B981] px-2 py-0.5 border-2 border-black shadow-[3px_3px_0px_0px_#000] inline-block mt-2">
          FIND ACTIVE MERGERS.
        </span>
      </h1>

      <div className="mx-auto mt-6 max-w-2xl bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000] text-left">
        <p className="text-xs sm:text-sm font-mono font-bold text-black uppercase leading-relaxed">
          &gt; Real reviewer latency, merge rates, and first-timer acceptance across 102,000+ open-source GitHub projects. No ghosting.
        </p>
      </div>

      {/* Hero Search Bar - Industrial Brutalist Console */}
      <div
        id="hero-search-container"
        ref={heroSearchRef}
        className="mt-8 max-w-3xl mx-auto"
      >
        <div
          onClick={() => openSearch(searchQuery)}
          className="relative flex items-center border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] transition-all cursor-pointer group"
        >
          <div className="bg-black text-[#FACC15] p-3.5 sm:p-4 border-r-2 border-black flex items-center justify-center shrink-0">
            <Search className="h-5 w-5" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            readOnly
            placeholder={`SEARCH 102,000+ REPOSITORIES, e.g. ${famousRepos[placeholderIndex]?.toUpperCase() || "FASTAPI, RUST, NEXTJS..."}`}
            value={searchQuery}
            className="w-full px-4 text-xs sm:text-sm text-black placeholder:text-gray-500 font-mono font-bold uppercase focus:outline-none bg-transparent cursor-pointer"
          />
          <div className="flex items-center gap-2 pointer-events-none shrink-0 pr-4">
            {searchQuery ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSearch();
                }}
                className="pointer-events-auto text-xs font-mono font-bold text-black border border-black bg-[#FACC15] px-2 py-0.5 mr-1 cursor-pointer shadow-[1px_1px_0px_0px_#000]"
              >
                CLEAR
              </button>
            ) : null}
            <kbd className="hidden sm:inline-flex items-center gap-1 border-2 border-black bg-[#FACC15] px-2 py-1 font-mono text-xs font-black text-black shadow-[1px_1px_0px_0px_#000]">
              <span>⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Quick-explore chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="font-mono font-bold text-black uppercase text-[11px] mr-1">QUICK JUMP:</span>
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
              className="border-2 border-black bg-white px-3 py-1 font-mono font-black text-xs text-black uppercase shadow-[2px_2px_0px_0px_#000] hover:bg-[#FACC15] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              #{term.toUpperCase()}
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

      {/* Macro Telemetry Strip - Industrial 2px Black Grid */}
      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 max-w-4xl mx-auto border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] divide-x-2 divide-y-2 sm:divide-y-0 divide-black text-center">
        <div className="p-4 flex flex-col justify-between">
          <div className="text-3xl sm:text-4xl font-black font-mono text-black tracking-tighter">
            {stats?.avg_response_hours ? "82%" : <TelemetrySkeleton />}
          </div>
          <div className="text-[11px] font-mono font-black uppercase text-black bg-[#FACC15] border-t-2 border-black py-1 mt-3">
            AVG MERGE RATE
          </div>
        </div>
        <div className="p-4 flex flex-col justify-between">
          <div className="text-3xl sm:text-4xl font-black font-mono text-black tracking-tighter">
            {stats?.avg_response_hours ? formatReviewTime(stats.avg_response_hours) : <TelemetrySkeleton />}
          </div>
          <div className="text-[11px] font-mono font-black uppercase text-black bg-[#38BDF8] border-t-2 border-black py-1 mt-3">
            MEDIAN TURNAROUND
          </div>
        </div>
        <div className="p-4 flex flex-col justify-between">
          <div className="text-3xl sm:text-4xl font-black font-mono text-black tracking-tighter">
            {stats?.s_class_count !== undefined ? <CountUp value={stats.s_class_count} /> : <TelemetrySkeleton />}
          </div>
          <div className="text-[11px] font-mono font-black uppercase text-black bg-[#10B981] border-t-2 border-black py-1 mt-3">
            S &amp; A TIER REPOS
          </div>
        </div>
        <div className="p-4 flex flex-col justify-between">
          <div className="text-3xl sm:text-4xl font-black font-mono text-black tracking-tighter">
            {stats?.total_repos ? <CountUp value={stats.total_repos} /> : <TelemetrySkeleton />}
          </div>
          <div className="text-[11px] font-mono font-black uppercase text-black bg-[#A855F7] text-white border-t-2 border-black py-1 mt-3">
            REPOS SCORED
          </div>
        </div>
      </div>
    </section>
  );
}
