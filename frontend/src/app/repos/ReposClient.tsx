"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import {
  List,
  LayoutGrid,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { AuthModal } from "@/components/AuthModal";
import { FilterBar } from "./components/FilterBar";
import { RepoGrid } from "./components/RepoGrid";
import { PaginationBar } from "./components/PaginationBar";
import { FaqAccordion } from "./components/FaqAccordion";
import { useRepoFilters, buildRepoQueryParams } from "./components/useRepoFilters";

interface ReposClientProps {
  initialRepos: Repo[];
  initialTotal: number;
}

export function ReposClient({ initialRepos, initialTotal }: ReposClientProps) {
  const searchParams = useSearchParams();
  const {
    searchQuery,
    setSearchQuery,
    selectedLang,
    setSelectedLang,
    selectedTier,
    setSelectedTier,
    selectedStarBucket,
    setSelectedStarBucket,
    selectedMergeRate,
    selectedFirstTimer,
    trendingOnly,
    setTrendingOnly,
    page,
    setPage,
    activeFilterCount,
    resetFilters,
  } = useRepoFilters(searchParams);
  const perPage = 18;

  // Data State
  const [repos, setRepos] = useState<Repo[]>(initialRepos);
  const [totalCount, setTotalCount] = useState<number>(initialTotal);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"row" | "card">("row");

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isLoggedIn = useMemo(() => {
    return typeof document !== "undefined" && document.cookie.includes("opendoor_token=");
  }, []);

  // Fetch Repos Function
  const fetchRepos = useCallback(async () => {
    setLoading(true);
    const params = buildRepoQueryParams(
      {
        searchQuery,
        selectedLang,
        selectedTier,
        selectedStarBucket,
        selectedMergeRate,
        selectedFirstTimer,
        trendingOnly,
        page,
      },
      page,
      perPage
    );

    // Sync state with URL without hard refresh
    const newUrl = `/repos?${params.toString()}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch repositories");
      const data = await res.json();
      const rawList = data.data || data.repos || [];

      const mapped = rawList.map((r: Record<string, unknown>) => ({
        ...(r as unknown as Repo),
        c_rank_tier: (r.c_rank_tier as string) || (r.class_rank as string) || "A",
        class_rank: (r.class_rank as string) || (r.c_rank_tier as string) || "A",
        first_timer_success_rate:
          (r.first_timer_success_rate as number) !== undefined
            ? (r.first_timer_success_rate as number)
            : (r.first_timer_rate as number),
      }));

      setRepos(mapped);
      if (data.total !== undefined) {
        setTotalCount(data.total);
      } else if (data.pagination?.total !== undefined) {
        setTotalCount(data.pagination.total);
      }
    } catch (err) {
      console.error("Failed to load repos:", err);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    searchQuery,
    selectedLang,
    selectedTier,
    selectedStarBucket,
    selectedMergeRate,
    selectedFirstTimer,
    trendingOnly,
    perPage,
  ]);

  // Debounced Search & Trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRepos();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchRepos]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  // Server-side filtered list, memoized to stabilize identity for the grid.
  const filteredRepos = useMemo(() => repos, [repos]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-x-hidden font-sans">
      <Header />

      <main className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-[var(--text-tertiary)]">
          <Link prefetch={false} href="/" title="Back to GetMerged Home" className="hover:text-[var(--text-primary)] transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-semibold">Repository Directory</span>
        </nav>

        {/* Header Hero Section */}
        <div className="card card-highlight p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="hero-badge mb-0">
              <span className="dot" />
              <span>{totalCount.toLocaleString()} SCORED REPOSITORIES</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="pill pill-green">✓ Active in last 30d</span>
              <span className="pill pill-purple">✓ Empirical 180d Telemetry</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-display text-[var(--text-primary)] tracking-tight mb-2">
            Explore Open Source Repositories
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] font-sans max-w-3xl leading-relaxed">
            Filter by language, C-Rank tier, outside merge rate, and stars to find welcoming projects where your code gets reviewed and merged.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={(value) => {
            setSearchQuery(value);
            setPage(1);
          }}
          onClearSearch={() => setSearchQuery("")}
          selectedLang={selectedLang}
          onLangChange={(value) => {
            setSelectedLang(value);
            setPage(1);
          }}
          selectedTier={selectedTier}
          onTierChange={(value) => {
            setSelectedTier(value);
            setPage(1);
          }}
          selectedStarBucket={selectedStarBucket}
          onStarBucketChange={(value) => {
            setSelectedStarBucket(value);
            setPage(1);
          }}
          trendingOnly={trendingOnly}
          onTrendingToggle={() => {
            setTrendingOnly((prev) => !prev);
            setPage(1);
          }}
          activeFilterCount={activeFilterCount}
          onReset={resetFilters}
        />

        {/* View Mode & Repositories List/Grid */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="text-xs font-mono text-[var(--text-tertiary)] font-semibold uppercase tracking-wider">
            Showing {filteredRepos.length} of {totalCount.toLocaleString()} repositories
          </div>
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
        </div>

        {/* Repositories Grid */}
        <RepoGrid loading={loading} repos={filteredRepos} isLoggedIn={isLoggedIn} onReset={resetFilters} viewMode={viewMode} />

        {/* Pagination Bar */}
        <PaginationBar
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setPage}
        />

        {/* Directory FAQ Section */}
        <FaqAccordion />
      </main>

      <Footer />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
