"use client";

import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
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
    <motion.button
      type="button"
      aria-pressed={def.isActive}
      title={def.title}
      onClick={() => onSelect(def.preset)}
      whileTap={{ scale: 0.96 }}
      className={`px-4 py-2 rounded-lg font-bold transition-all shrink-0 cursor-pointer border ${
        def.isActive ? def.activeClass : "bg-[#1c1c1c] text-[#d4d4d4] border-white/[0.08] hover:border-white/[0.16]"
      }`}
    >
      {def.label}
    </motion.button>
  );
}

function ShowroomBody({ visibleRepos, isLoggedIn, onResetFilters }: Pick<RepoShowroomProps, "visibleRepos" | "isLoggedIn" | "onResetFilters">) {
  if (visibleRepos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-xl border border-dashed border-white/[0.12] p-12 text-center bg-[#141414] my-4"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#1c1c1c] text-[#a3a3a3] mb-3">
          <Search className="h-5 w-5" />
        </div>
        <h3 className="text-base font-bold text-white font-sans">No open doors found</h3>
        <p className="mt-1 text-xs text-[#737373] font-sans max-w-sm mx-auto leading-relaxed">
          No repositories matched your filters.
        </p>
        <button
          onClick={onResetFilters}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1c1c1c] border border-white/[0.08] px-4 py-2 text-xs font-mono font-semibold text-white hover:bg-[#262626] active:scale-95 transition-all cursor-pointer"
        >
          Reset all filters
        </button>
      </motion.div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {visibleRepos.map((repo, index) => (
          <motion.div key={repo.id} transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: index * 0.04 }}>
            <RepoCard repo={repo} isLoggedIn={isLoggedIn} />
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="my-8 rounded-xl bg-[#141414] border border-white/[0.08] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white font-sans">Looking for custom languages or merge rates?</h3>
          <p className="text-xs text-[#737373] mt-1 font-sans">Filter across 20+ ecosystems with full pagination.</p>
        </div>

        <Link
          href="/repos"
          title="Browse full repository database with all filters"
          className="inline-flex items-center gap-2 rounded-lg bg-[#ff6b00] text-white hover:bg-[#ff8a33] px-6 py-3 text-xs font-bold font-sans shrink-0 transition-colors"
        >
          <span>Open Explorer</span>
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
  const chips: ChipDef[] = [
    {
      preset: "hof",
      label: "Hall of Fame",
      title: "Filter repositories by S-Tier Hall of Fame",
      isActive: selectedTier === "S" && selectedFirstTimerBucket === "All" && selectedMinMergeRate === "All" && selectedBucket === "All",
      activeClass: "bg-[#fbbf24] text-black border-[#fbbf24]",
    },
    {
      preset: "welcoming",
      label: "Welcoming",
      title: "Filter repositories by Welcoming (A-Tier)",
      isActive: selectedTier === "A" && selectedFirstTimerBucket === "All" && selectedMinMergeRate === "All" && selectedBucket === "All",
      activeClass: "bg-[#10b981] text-white border-[#10b981]",
    },
    {
      preset: "giants",
      label: "Star Giants",
      title: "Filter repositories with 50k+ stars",
      isActive: selectedBucket === "50k+",
      activeClass: "bg-[#c084fc] text-white border-[#c084fc]",
    },
    {
      preset: "gfi",
      label: "Has Good First Issue",
      title: "Filter repositories with good first issues",
      isActive: selectedFirstTimerBucket === "has_gfi",
      activeClass: "bg-[#38bdf8] text-white border-[#38bdf8]",
    },
    {
      preset: "merge",
      label: "High Merge Rate",
      title: "Filter repositories with high merge rate (>= 60%)",
      isActive: selectedMinMergeRate === "60%",
      activeClass: "bg-[#f87171] text-white border-[#f87171]",
    },
    {
      preset: "firstTimer",
      label: "First Timer Awesome",
      title: "Filter repositories with awesome first-timer acceptance (> 60%)",
      isActive: selectedFirstTimerBucket === "60-80%",
      activeClass: "bg-[#ff6b00] text-white border-[#ff6b00]",
    },
  ];

  return (
    <HomeSection maxWidth="7xl" as="main" id="leaderboard-grid" className="flex-1 w-full pt-4">
      {/* Category Switcher */}
      <div className="mb-8 rounded-xl bg-[#141414] p-5 sm:p-6 border border-white/[0.08] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">Explore Open Doors by Category</h2>
          </div>

          <Link
            href="/repos"
            title="Open full multi-filter repository directory"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1c1c1c] border border-white/[0.08] hover:bg-[#262626] text-white px-5 py-2.5 text-xs font-semibold transition-all self-start md:self-auto"
          >
            <span>Explore All {stats?.total_repos ? `${stats.total_repos.toLocaleString()} ` : ""}Repositories</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 text-xs font-sans">
          {chips.map((chip) => (
            <CategoryChip key={chip.preset} def={chip} onSelect={onSelectCategory} />
          ))}
        </div>
      </div>

      {/* Repos Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-10">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#141414] p-6 h-[260px] animate-pulse" />
          ))}
        </div>
      ) : (
        <ShowroomBody visibleRepos={visibleRepos} isLoggedIn={isLoggedIn} onResetFilters={onResetFilters} />
      )}
    </HomeSection>
  );
}
