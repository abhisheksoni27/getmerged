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
      className={`px-4 py-2 rounded-xl font-semibold transition-all shrink-0 cursor-pointer border text-xs ${
        def.isActive ? def.activeClass : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
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
        className="rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center bg-[var(--bg-surface)] my-4 shadow-sm"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] mb-3">
          <Search className="h-5 w-5" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)] font-display">No open doors found</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)] font-sans max-w-sm mx-auto leading-relaxed">
          No repositories matched your filters.
        </p>
        <button
          onClick={onResetFilters}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-4 py-2 text-xs font-mono font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-95 transition-all cursor-pointer"
        >
          Reset all filters
        </button>
      </motion.div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {visibleRepos.map((repo, index) => (
          <motion.div key={repo.id} transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: index * 0.04 }}>
            <RepoCard repo={repo} isLoggedIn={isLoggedIn} />
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="my-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-display">Looking for custom languages or merge rates?</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">Filter across 20+ ecosystems with full pagination.</p>
        </div>

        <Link prefetch={false}
          href="/repos"
          title="Browse full repository database with all filters"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 px-6 py-3 text-xs font-bold font-sans shrink-0 shadow-sm transition-colors"
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
      activeClass: "bg-[#C4910A] text-white border-[#C4910A]",
    },
    {
      preset: "welcoming",
      label: "Welcoming",
      title: "Filter repositories by Welcoming (A-Tier)",
      isActive: selectedTier === "A" && selectedFirstTimerBucket === "All" && selectedMinMergeRate === "All" && selectedBucket === "All",
      activeClass: "bg-[#0D9668] text-white border-[#0D9668]",
    },
    {
      preset: "giants",
      label: "Star Giants",
      title: "Filter repositories with 50k+ stars",
      isActive: selectedBucket === "50k+",
      activeClass: "bg-[#8B6BB5] text-white border-[#8B6BB5]",
    },
    {
      preset: "gfi",
      label: "Has Good First Issue",
      title: "Filter repositories with good first issues",
      isActive: selectedFirstTimerBucket === "has_gfi",
      activeClass: "bg-[#2D8ABF] text-white border-[#2D8ABF]",
    },
    {
      preset: "merge",
      label: "High Merge Rate",
      title: "Filter repositories with high merge rate (>= 60%)",
      isActive: selectedMinMergeRate === "60%",
      activeClass: "bg-[#C4463A] text-white border-[#C4463A]",
    },
    {
      preset: "firstTimer",
      label: "First Timer Awesome",
      title: "Filter repositories with awesome first-timer acceptance (> 60%)",
      isActive: selectedFirstTimerBucket === "60-80%",
      activeClass: "bg-[var(--color-primary)] text-white border-[var(--color-primary)]",
    },
  ];

  return (
    <HomeSection maxWidth="7xl" as="main" id="leaderboard-grid" className="flex-1 w-full pt-4">
      {/* Category Switcher */}
      <div className="mb-8 rounded-2xl bg-[var(--bg-surface)] p-6 sm:p-7 border border-[var(--border-subtle)] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] font-display">Explore Open Doors by Category</h2>
          </div>

          <Link prefetch={false}
            href="/repos"
            title="Open full multi-filter repository directory"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--text-primary)] hover:bg-[var(--color-neutral-800)] text-[var(--bg-canvas)] px-5 py-2.5 text-xs font-semibold shadow-sm transition-all self-start md:self-auto"
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 h-[280px] shadow-sm animate-pulse" />
          ))}
        </div>
      ) : (
        <ShowroomBody visibleRepos={visibleRepos} isLoggedIn={isLoggedIn} onResetFilters={onResetFilters} />
      )}
    </HomeSection>
  );
}
