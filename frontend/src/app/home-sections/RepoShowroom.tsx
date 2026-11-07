"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, List, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { RepoCard } from "@/components/RepoCard";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { MacroStats, Repo } from "@/types/opendoor";
import { HomeSection } from "./HomeSection";
import { CategoryPreset } from "./useHomeData";

interface RepoShowroomProps {
  visibleRepos: Repo[];
  loading: boolean;
  stats: MacroStats | null;
  isLoggedIn: boolean;
  selectedTier: string;
  selectedBucket: string;
  selectedFirstTimerBucket: string;
  selectedMinMergeRate: string;
  onSelectCategory: (preset: CategoryPreset) => void;
  onResetFilters: () => void;
}

interface ChipDef {
  preset: CategoryPreset;
  label: string;
  title: string;
  isActive: boolean;
  activeClass: string;
}

function CategoryChip({ def, onSelect }: { def: ChipDef; onSelect: (preset: CategoryPreset) => void }) {
  return (
    <button
      type="button"
      aria-pressed={def.isActive}
      title={def.title}
      onClick={() => onSelect(def.preset)}
      className={`px-3.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shrink-0 cursor-pointer border-2 border-black text-xs ${
        def.isActive
          ? "bg-black text-[#FACC15] shadow-none translate-x-0.5 translate-y-0.5"
          : "bg-[#FFFDF8] text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#F4F4EE]"
      }`}
    >
      {def.label}
    </button>
  );
}

function ShowroomBody({
  visibleRepos,
  isLoggedIn,
  onResetFilters,
  viewMode = "row",
}: Pick<RepoShowroomProps, "visibleRepos" | "isLoggedIn" | "onResetFilters"> & { viewMode?: "row" | "card" }) {
  if (visibleRepos.length === 0) {
    return (
      <div className="rounded-none border-2 border-dashed border-black p-12 text-center bg-white my-4 shadow-[4px_4px_0px_0px_#000]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-none bg-[#FACC15] border-2 border-black text-black mb-3 shadow-[2px_2px_0px_0px_#000]">
          <Search className="h-5 w-5" />
        </div>
        <h3 className="text-base font-black text-black font-display uppercase tracking-tight">No open doors found</h3>
        <p className="mt-1 text-xs text-neutral-700 font-mono max-w-sm mx-auto leading-relaxed">
          No repositories matched your filters.
        </p>
        <button
          onClick={onResetFilters}
          className="mt-4 inline-flex items-center gap-1.5 rounded-none bg-[#FFFDF8] border-2 border-black px-4 py-2 text-xs font-mono font-black text-black hover:bg-[#FACC15] shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer uppercase"
        >
          Reset all filters
        </button>
      </div>
    );
  }

  return (
    <>
      {viewMode === "row" ? (
        <div className="flex flex-col gap-3 mb-8">
          {visibleRepos.map((repo, index) => (
            <motion.div key={repo.id || repo.full_name} transition={{ duration: 0.3, ease: EASE_OUT_EXPO, delay: index * 0.02 }}>
              <RepoCard repo={repo} isLoggedIn={isLoggedIn} layout="row" />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {visibleRepos.map((repo, index) => (
            <motion.div key={repo.id || repo.full_name} transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: index * 0.03 }}>
              <RepoCard repo={repo} isLoggedIn={isLoggedIn} layout="card" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="my-8 rounded-none bg-[#FFFDF8] border-2 border-black p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[4px_4px_0px_0px_#000]">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-black font-display uppercase tracking-tight">Looking for custom languages or merge rates?</h3>
          <p className="text-xs text-neutral-700 mt-1 font-mono">Filter across 20+ ecosystems with full pagination and multi-variable criteria.</p>
        </div>

        <Link prefetch={false}
          href="/repos"
          title="Browse full repository database with all filters"
          className="inline-flex items-center gap-2 rounded-none bg-black text-[#FACC15] hover:bg-[#FACC15] hover:text-black px-6 py-3 text-xs font-mono font-black border-2 border-black shadow-[3px_3px_0px_0px_#000] uppercase shrink-0 transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <span>Open Full Directory</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}

/** Main curated showroom: category switcher + repo cards grid. */
export function RepoShowroom({
  visibleRepos,
  loading,
  stats,
  isLoggedIn,
  selectedTier,
  selectedBucket,
  selectedFirstTimerBucket,
  selectedMinMergeRate,
  onSelectCategory,
  onResetFilters,
}: RepoShowroomProps) {
  const [viewMode, setViewMode] = useState<"row" | "card">("row");

  const chips: ChipDef[] = [
    {
      preset: "welcoming",
      label: "Welcoming (A & S Tier)",
      title: "Filter repositories by Welcoming tiers",
      isActive: selectedTier === "A" && selectedFirstTimerBucket === "All" && selectedMinMergeRate === "All" && selectedBucket === "All",
      activeClass: "bg-[#059669] text-white border-[#059669]",
    },
    {
      preset: "hof",
      label: "S-Tier Hall of Fame",
      title: "Filter repositories by S-Tier Hall of Fame",
      isActive: selectedTier === "S" && selectedFirstTimerBucket === "All" && selectedMinMergeRate === "All" && selectedBucket === "All",
      activeClass: "bg-[#D97706] text-white border-[#D97706]",
    },
    {
      preset: "merge",
      label: "High Merge Rate (>70%)",
      title: "Filter repositories with high merge rate",
      isActive: selectedMinMergeRate === "60%",
      activeClass: "bg-[var(--color-primary)] text-white border-[var(--color-primary)]",
    },
    {
      preset: "gfi",
      label: "Beginner Issues Open",
      title: "Filter repositories with good first issues",
      isActive: selectedFirstTimerBucket === "has_gfi",
      activeClass: "bg-[#2563EB] text-white border-[#2563EB]",
    },
    {
      preset: "firstTimer",
      label: "First-Timer Friendly",
      title: "Filter repositories with high first-timer success",
      isActive: selectedFirstTimerBucket === "60-80%",
      activeClass: "bg-[#7C3AED] text-white border-[#7C3AED]",
    },
    {
      preset: "giants",
      label: "50k+ Stars",
      title: "Filter repositories with 50k+ stars",
      isActive: selectedBucket === "50k+",
      activeClass: "bg-[var(--text-primary)] text-white border-[var(--text-primary)]",
    },
  ];

  return (
    <HomeSection maxWidth="7xl" as="main" id="leaderboard-grid" className="flex-1 w-full pt-4">
      {/* Category Switcher & Layout Toggle */}
      <div className="mb-6 rounded-none bg-white p-5 sm:p-6 border-2 border-black shadow-[4px_4px_0px_0px_#000] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-black font-display uppercase tracking-tight">
              Verified Welcoming Repositories
            </h2>
            <p className="text-xs sm:text-sm text-neutral-700 font-mono mt-0.5">
              Live telemetry scored by real PR response speed and external author acceptance rates.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle: Rows vs Cards */}
            <div className="flex items-center rounded-none bg-[#FFFDF8] border-2 border-black p-0.5 text-xs shadow-[2px_2px_0px_0px_#000]">
              <button
                type="button"
                onClick={() => setViewMode("row")}
                title="List View (high density)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none font-mono transition-all cursor-pointer ${
                  viewMode === "row"
                    ? "bg-black text-white font-black"
                    : "text-black hover:bg-neutral-200 font-bold"
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">ROWS</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                title="Grid View (showcase cards)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none font-mono transition-all cursor-pointer ${
                  viewMode === "card"
                    ? "bg-black text-white font-black"
                    : "text-black hover:bg-neutral-200 font-bold"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">CARDS</span>
              </button>
            </div>

            <Link prefetch={false}
              href="/repos"
              title="Open full multi-filter repository directory"
              className="inline-flex items-center justify-center gap-1.5 rounded-none bg-[#FACC15] hover:bg-black hover:text-[#FACC15] text-black border-2 border-black px-4 py-2 text-xs font-mono font-black shadow-[2px_2px_0px_0px_#000] uppercase transition-all whitespace-nowrap active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span>Explore All {stats?.total_repos ? `${stats.total_repos.toLocaleString()}` : "102k"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
          {chips.map((chip) => (
            <CategoryChip key={chip.preset} def={chip} onSelect={onSelectCategory} />
          ))}
        </div>
      </div>

      {/* Repos Cards/Rows Grid */}
      {loading ? (
        <div className="flex flex-col gap-3 mb-10">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-none border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000] animate-pulse" />
          ))}
        </div>
      ) : (
        <ShowroomBody visibleRepos={visibleRepos} isLoggedIn={isLoggedIn} onResetFilters={onResetFilters} viewMode={viewMode} />
      )}
    </HomeSection>
  );
}
