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

function ShowroomBody({
  visibleRepos,
  isLoggedIn,
  onResetFilters,
  viewMode = "row",
}: Pick<RepoShowroomProps, "visibleRepos" | "isLoggedIn" | "onResetFilters"> & { viewMode?: "row" | "card" }) {
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
      <div className="my-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-display">Looking for custom languages or merge rates?</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">Filter across 20+ ecosystems with full pagination and multi-variable criteria.</p>
        </div>

        <Link prefetch={false}
          href="/repos"
          title="Browse full repository database with all filters"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 px-6 py-3 text-xs font-bold font-sans shrink-0 shadow-sm transition-colors"
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
      <div className="mb-6 rounded-2xl bg-[var(--bg-surface)] p-5 sm:p-6 border border-[var(--border-subtle)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-display tracking-tight">
              Verified Welcoming Repositories
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-0.5">
              Live telemetry scored by real PR response speed and external author acceptance rates.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle: Rows vs Cards */}
            <div className="flex items-center rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("row")}
                title="List View (high density)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  viewMode === "row"
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-2xs"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Rows</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                title="Grid View (showcase cards)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  viewMode === "card"
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-2xs"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>

            <Link prefetch={false}
              href="/repos"
              title="Open full multi-filter repository directory"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--text-primary)] hover:bg-[var(--color-neutral-800)] text-[var(--bg-canvas)] px-4 py-2 text-xs font-semibold shadow-2xs transition-all whitespace-nowrap"
            >
              <span>Explore All {stats?.total_repos ? `${stats.total_repos.toLocaleString()}` : "102k"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-sans scrollbar-none">
          {chips.map((chip) => (
            <CategoryChip key={chip.preset} def={chip} onSelect={onSelectCategory} />
          ))}
        </div>
      </div>

      {/* Repos Cards/Rows Grid */}
      {loading ? (
        <div className="flex flex-col gap-3 mb-10">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm animate-pulse" />
          ))}
        </div>
      ) : (
        <ShowroomBody visibleRepos={visibleRepos} isLoggedIn={isLoggedIn} onResetFilters={onResetFilters} viewMode={viewMode} />
      )}
    </HomeSection>
  );
}
