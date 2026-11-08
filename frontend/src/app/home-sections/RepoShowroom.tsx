"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, List, LayoutGrid } from "lucide-react";
import { RepoCard } from "@/components/RepoCard";
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
      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors shrink-0 cursor-pointer border ${
        def.isActive
          ? "bg-[rgba(163,113,247,0.2)] text-white border-[var(--purple-bright)] font-semibold shadow-xs"
          : "bg-[#0D111A] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
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
      <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center bg-white my-6 shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 mb-3">
          <Search className="h-5 w-5" />
        </div>
        <h3 className="text-base font-bold text-zinc-900 font-display">No open doors found</h3>
        <p className="mt-1 text-xs text-zinc-500 font-sans max-w-sm mx-auto leading-relaxed">
          No repositories matched your selected criteria.
        </p>
        <button
          onClick={onResetFilters}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          Reset all filters
        </button>
      </div>
    );
  }

  return (
    <>
      {viewMode === "row" ? (
        <div className="flex flex-col gap-4 mb-10">
          {visibleRepos.map((repo) => (
            <div key={repo.id || repo.full_name}>
              <RepoCard repo={repo} isLoggedIn={isLoggedIn} layout="row" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10">
          {visibleRepos.map((repo) => (
            <div key={repo.id || repo.full_name}>
              <RepoCard repo={repo} isLoggedIn={isLoggedIn} layout="card" />
            </div>
          ))}
        </div>
      )}

      {/* Bottom CTA with Generous Space */}
      <div className="my-10 rounded-2xl border border-zinc-200/90 bg-white p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-zinc-950">Looking for custom languages or merge rates?</h3>
          <p className="text-sm text-zinc-500 mt-1 font-sans">Filter across 20+ ecosystems with full pagination and multi-variable criteria.</p>
        </div>

        <Link prefetch={false}
          href="/repos"
          title="Browse full repository database with all filters"
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 px-6 py-3 text-xs font-semibold font-sans shrink-0 shadow-xs transition-colors"
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
      activeClass: "bg-emerald-600 text-white",
    },
    {
      preset: "hof",
      label: "S-Tier Hall of Fame",
      title: "Filter repositories by S-Tier Hall of Fame",
      isActive: selectedTier === "S" && selectedFirstTimerBucket === "All" && selectedMinMergeRate === "All" && selectedBucket === "All",
      activeClass: "bg-amber-600 text-white",
    },
    {
      preset: "merge",
      label: "High Merge Rate (>70%)",
      title: "Filter repositories with high merge rate",
      isActive: selectedMinMergeRate === "60%",
      activeClass: "bg-zinc-900 text-white",
    },
    {
      preset: "gfi",
      label: "Beginner Issues Open",
      title: "Filter repositories with good first issues",
      isActive: selectedFirstTimerBucket === "has_gfi",
      activeClass: "bg-sky-600 text-white",
    },
    {
      preset: "firstTimer",
      label: "First-Timer Friendly",
      title: "Filter repositories with high first-timer success",
      isActive: selectedFirstTimerBucket === "60-80%",
      activeClass: "bg-purple-600 text-white",
    },
    {
      preset: "giants",
      label: "50k+ Stars",
      title: "Filter repositories with 50k+ stars",
      isActive: selectedBucket === "50k+",
      activeClass: "bg-zinc-900 text-white",
    },
  ];

  return (
    <HomeSection maxWidth="7xl" as="main" id="leaderboard-grid" className="flex-1 w-full pt-4">
      {/* Category Switcher & Layout Toggle */}
      <div className="mb-8 rounded-xl bg-[rgba(17,24,39,0.7)] p-6 sm:p-8 border border-[var(--border-subtle)] shadow-xs space-y-5 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-display tracking-tight">
              Verified Welcoming Repositories
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-1">
              Live telemetry scored by real PR response speed and outside author acceptance rates.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle: Rows vs Cards */}
            <div className="flex items-center rounded-lg bg-[#0D111A] border border-[var(--border-subtle)] p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("row")}
                title="List View (high density)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-xs transition-colors cursor-pointer ${
                  viewMode === "row"
                    ? "bg-[#21262D] text-[var(--text-primary)] font-semibold shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Rows</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                title="Grid View (showcase cards)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-xs transition-colors cursor-pointer ${
                  viewMode === "card"
                    ? "bg-[#21262D] text-[var(--text-primary)] font-semibold shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>

            <Link prefetch={false}
              href="/repos"
              title="Open full multi-filter repository directory"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#21262D] border border-[var(--border-strong)] hover:bg-[#30363D] text-[var(--text-primary)] px-3.5 py-1.5 text-xs font-mono font-medium shadow-xs transition-colors whitespace-nowrap"
            >
              <span>Explore All {stats?.total_repos ? `${stats.total_repos.toLocaleString()}` : "153k"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-sans scrollbar-none pt-2 border-t border-[var(--border-subtle)]">
          {chips.map((chip) => (
            <CategoryChip key={chip.preset} def={chip} onSelect={onSelectCategory} />
          ))}
        </div>
      </div>

      {/* Repos Cards/Rows Grid */}
      {loading ? (
        <div className="flex flex-col gap-4 mb-10">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs animate-pulse" />
          ))}
        </div>
      ) : (
        <ShowroomBody visibleRepos={visibleRepos} isLoggedIn={isLoggedIn} onResetFilters={onResetFilters} viewMode={viewMode} />
      )}
    </HomeSection>
  );
}
