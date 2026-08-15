"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RepoCard } from "@/components/RepoCard";
import { LangLogo } from "@/components/LangLogo";
import { Repo } from "@/types/opendoor";
import {
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  Flame,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Check,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { AuthModal } from "@/components/AuthModal";

const LANGUAGES = [
  "All",
  "JavaScript",
  "TypeScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "C#",
  "PHP",
  "Ruby",
  "Kotlin",
  "Swift",
];

const TIERS = ["All", "S", "A", "B", "C", "D"];

const STAR_BUCKETS = [
  { label: "All Stars", value: "All" },
  { label: "< 5k ★", value: "<5k" },
  { label: "5k - 20k ★", value: "5k-20k" },
  { label: "20k - 50k ★", value: "20k-50k" },
  { label: "50k+ ★", value: "50k+" },
];

const MERGE_RATE_BUCKETS = [
  { label: "All Rates", value: "All" },
  { label: "High (≥ 60%)", value: "60" },
  { label: "Moderate (≥ 40%)", value: "40" },
  { label: "Active (≥ 20%)", value: "20" },
];

const FIRST_TIMER_BUCKETS = [
  { label: "Any Acceptance", value: "All" },
  { label: "High (> 50%)", value: "50" },
  { label: "Moderate (> 25%)", value: "25" },
];

export function ReposClient() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLang, setSelectedLang] = useState<string>("All");
  const [selectedTier, setSelectedTier] = useState<string>("All");
  const [selectedStarBucket, setSelectedStarBucket] = useState<string>("All");
  const [selectedMergeRate, setSelectedMergeRate] = useState<string>("All");
  const [selectedFirstTimer, setSelectedFirstTimer] = useState<string>("All");
  const [trendingOnly, setTrendingOnly] = useState<boolean>(false);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const perPage = 24;

  // Mobile Bottom Sheet Modal State (Zomato/Airbnb style)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState<boolean>(false);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalConfig, setAuthModalConfig] = useState<{ title?: string; description?: string; source?: string }>({});

  const openAuthModal = (title?: string, description?: string, source = "modal") => {
    setAuthModalConfig({ title, description, source });
    setIsAuthModalOpen(true);
  };

  const [isLoggedIn] = useState<boolean>(() => {
    return typeof document !== "undefined" && document.cookie.includes("opendoor_token=");
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedLang !== "All") count++;
    if (selectedTier !== "All") count++;
    if (selectedStarBucket !== "All") count++;
    if (selectedMergeRate !== "All") count++;
    if (selectedFirstTimer !== "All") count++;
    if (trendingOnly) count++;
    return count;
  }, [selectedLang, selectedTier, selectedStarBucket, selectedMergeRate, selectedFirstTimer, trendingOnly]);

  const resetFilters = () => {
    setSelectedLang("All");
    setSelectedTier("All");
    setSelectedStarBucket("All");
    setSelectedMergeRate("All");
    setSelectedFirstTimer("All");
    setTrendingOnly(false);
    setSearchQuery("");
    setPage(1);
  };

  const getStarBounds = (bucket: string) => {
    switch (bucket) {
      case "<5k":
        return { max: "5000" };
      case "5k-20k":
        return { min: "5000", max: "20000" };
      case "20k-50k":
        return { min: "20000", max: "50000" };
      case "50k+":
        return { min: "50000" };
      default:
        return {};
    }
  };

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("per_page", perPage.toString());
    params.set("sort", "stars");
    params.set("order", "desc");

    if (searchQuery.trim()) params.set("name", searchQuery.trim());
    if (selectedLang !== "All") params.set("language", selectedLang);
    if (selectedTier !== "All") params.set("tier", selectedTier);
    if (trendingOnly) params.set("trending", "true");
    if (selectedMergeRate !== "All") params.set("min_merge_rate", selectedMergeRate);
    if (selectedFirstTimer !== "All") params.set("min_first_timer_success_rate", selectedFirstTimer);

    const bounds = getStarBounds(selectedStarBucket);
    if (bounds.min) params.set("min_stars", bounds.min);
    if (bounds.max) params.set("max_stars", bounds.max);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos?${params.toString()}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      const rawList = data.data || data.repos || [];
      const total = data.meta?.total ?? data.total ?? (Array.isArray(rawList) ? rawList.length : 0);

      if (Array.isArray(rawList)) {
        const mappedList: Repo[] = rawList.map((r: Record<string, unknown>) => ({
          ...(r as unknown as Repo),
          c_rank_tier: (r.c_rank_tier as string) || (r.class_rank as string) || "A",
          first_timer_success_rate:
            (r.first_timer_success_rate as number) !== undefined
              ? (r.first_timer_success_rate as number)
              : (r.first_timer_rate as number),
        }));
        setRepos(mappedList);
        setTotalCount(total);
      } else {
        setRepos([]);
        setTotalCount(0);
      }
    } catch {
      setRepos([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedLang, selectedTier, selectedStarBucket, selectedMergeRate, selectedFirstTimer, trendingOnly]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] dev-grid-pattern text-zinc-900 overflow-x-hidden font-sans">
      <Header />

      <main className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Link href="/" title="Back to Opendoor Home" className="hover:text-zinc-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-zinc-900 font-semibold">Repository Directory</span>
        </nav>

        {/* Header Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-zinc-200/80 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-xs font-mono text-orange-950 font-semibold mb-3">
              <Sparkles className="h-3.5 w-3.5 text-orange-600" />
              <span>C-Rank™ Scored Repositories</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-space text-zinc-950 tracking-tight">
              Open-Source Repository Explorer
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 font-sans mt-2 max-w-2xl leading-relaxed">
              Browse public GitHub repositories scored on merge velocity, maintainer responsiveness, and first-time PR welcome rates.
            </p>
          </div>

          {/* Quick Counter Badge */}
          <div className="flex items-center gap-3 bg-white border border-zinc-200/90 rounded-2xl px-5 py-3 shadow-2xs shrink-0 self-start md:self-auto">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <span className="block text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                Total Repositories
              </span>
              <span className="text-xl font-bold font-mono text-zinc-950">
                {totalCount > 0 ? totalCount.toLocaleString() : "1,400+"}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <section className="bg-white border border-zinc-200/90 rounded-3xl p-4 sm:p-5 shadow-xs mb-8">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by repo name (e.g. facebook/react, fastapi)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Desktop Filter Pills */}
            <div className="hidden lg:flex items-center gap-2.5 shrink-0 font-sans text-xs">
              {/* Language Select */}
              <select
                value={selectedLang}
                onChange={(e) => {
                  setSelectedLang(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by language"
                className="px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 font-medium focus:ring-2 focus:ring-zinc-900 cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l === "All" ? "All Languages" : l}
                  </option>
                ))}
              </select>

              {/* Tier Select */}
              <select
                value={selectedTier}
                onChange={(e) => {
                  setSelectedTier(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by C-Rank tier"
                className="px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 font-medium focus:ring-2 focus:ring-zinc-900 cursor-pointer"
              >
                <option value="All">All Tiers (S–D)</option>
                <option value="S">Tier S (Top Welcoming)</option>
                <option value="A">Tier A (Welcoming)</option>
                <option value="B">Tier B (Standard)</option>
                <option value="C">Tier C (Selective)</option>
                <option value="D">Tier D (Slow / Stale)</option>
              </select>

              {/* Star Volume Select */}
              <select
                value={selectedStarBucket}
                onChange={(e) => {
                  setSelectedStarBucket(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by stars"
                className="px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 font-medium focus:ring-2 focus:ring-zinc-900 cursor-pointer"
              >
                {STAR_BUCKETS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>

              {/* Trending Toggle Pill */}
              <button
                type="button"
                onClick={() => {
                  setTrendingOnly((prev) => !prev);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer font-medium ${
                  trendingOnly
                    ? "bg-amber-500 text-white border-amber-600 shadow-2xs font-semibold"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                <Flame className={`h-3.5 w-3.5 ${trendingOnly ? "text-white" : "text-amber-500"}`} />
                <span>Trending</span>
              </button>

              {/* Reset button if filters active */}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  title="Reset all filters"
                  className="p-2.5 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mobile Filter Sheet Trigger Button */}
            <div className="flex lg:hidden items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 text-white font-sans text-xs font-semibold shadow-2xs cursor-pointer active:scale-98 transition-transform"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</span>
              </button>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  title="Reset all filters"
                  className="p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-600 text-xs font-semibold"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Language Chips Carousel */}
          <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-zinc-600 font-mono shrink-0 pl-1">Quick:</span>
            {LANGUAGES.map((lang) => {
              const active = selectedLang === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setSelectedLang(lang);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer font-sans shrink-0 ${
                    active
                      ? "bg-zinc-900 text-white font-bold shadow-2xs"
                      : "bg-zinc-50 border border-zinc-200/80 text-zinc-700 hover:bg-zinc-100 font-medium"
                  }`}
                >
                  {lang !== "All" && <LangLogo language={lang} />}
                  <span>{lang}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Repositories Grid */}
        <section aria-live="polite">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-56 rounded-3xl bg-white border border-zinc-200/80 p-6 animate-pulse" />
              ))}
            </div>
          ) : repos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {repos.map((repo) => (
                <RepoCard key={repo.id || repo.full_name} repo={repo} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/70 p-12 text-center">
              <Search className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-base font-bold font-space text-zinc-900">No repositories found</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto font-sans">
                No open-source repositories matched your filter criteria. Try adjusting the language or star parameters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold shadow-2xs cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </section>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex items-center justify-between border-t border-zinc-200 pt-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>

            <span className="text-xs font-mono font-medium text-zinc-500">
              Page <strong className="text-zinc-900">{page}</strong> of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                if (!isLoggedIn) {
                  openAuthModal(
                    "Sign In to Access Full Directory",
                    "Create a free account to browse page 2+ across all 1,400+ repositories and track custom watchlists.",
                    "pagination"
                  );
                  return;
                }
                setPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        )}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title={authModalConfig.title}
        description={authModalConfig.description}
        source={authModalConfig.source}
      />

      {/* Mobile Zomato/Airbnb Style Slide-up Bottom Sheet Modal */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200">
          <div
            className="w-full max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-space font-bold text-base text-zinc-900">Filters</h3>
                <p className="text-[11px] text-zinc-500 font-sans">Fine-tune open source discovery criteria</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                title="Close filter modal"
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Filters Content */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs font-sans">
              {/* Language Section */}
              <div>
                <label className="block font-bold text-zinc-900 mb-2">Language</label>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGES.map((lang) => {
                    const selected = selectedLang === lang;
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setSelectedLang(lang)}
                        className={`p-2 rounded-xl border text-center font-medium transition-all ${
                          selected
                            ? "bg-zinc-900 text-white border-zinc-900 font-bold"
                            : "bg-zinc-50 border-zinc-200 text-zinc-700"
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* C-Rank Tier Section */}
              <div>
                <label className="block font-bold text-zinc-900 mb-2">C-Rank™ Quality Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIERS.map((tier) => {
                    const selected = selectedTier === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={`p-2 rounded-xl border text-center font-medium transition-all ${
                          selected
                            ? "bg-zinc-900 text-white border-zinc-900 font-bold"
                            : "bg-zinc-50 border-zinc-200 text-zinc-700"
                        }`}
                      >
                        {tier === "All" ? "All Tiers" : `Tier ${tier}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Star Volume Section */}
              <div>
                <label className="block font-bold text-zinc-900 mb-2">GitHub Star Count</label>
                <div className="grid grid-cols-2 gap-2">
                  {STAR_BUCKETS.map((bucket) => {
                    const selected = selectedStarBucket === bucket.value;
                    return (
                      <button
                        key={bucket.value}
                        type="button"
                        onClick={() => setSelectedStarBucket(bucket.value)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between font-medium ${
                          selected
                            ? "bg-zinc-900 text-white border-zinc-900 font-bold"
                            : "bg-zinc-50 border-zinc-200 text-zinc-700"
                        }`}
                      >
                        <span>{bucket.label}</span>
                        {selected && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Merge Rate Section */}
              <div>
                <label className="block font-bold text-zinc-900 mb-2">Minimum Merge Rate</label>
                <div className="grid grid-cols-2 gap-2">
                  {MERGE_RATE_BUCKETS.map((b) => {
                    const selected = selectedMergeRate === b.value;
                    return (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => setSelectedMergeRate(b.value)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between font-medium ${
                          selected
                            ? "bg-zinc-900 text-white border-zinc-900 font-bold"
                            : "bg-zinc-50 border-zinc-200 text-zinc-700"
                        }`}
                      >
                        <span>{b.label}</span>
                        {selected && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* First Timer Success Section */}
              <div>
                <label className="block font-bold text-zinc-900 mb-2">First-Timer Acceptance Rate</label>
                <div className="grid grid-cols-2 gap-2">
                  {FIRST_TIMER_BUCKETS.map((b) => {
                    const selected = selectedFirstTimer === b.value;
                    return (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => setSelectedFirstTimer(b.value)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between font-medium ${
                          selected
                            ? "bg-zinc-900 text-white border-zinc-900 font-bold"
                            : "bg-zinc-50 border-zinc-200 text-zinc-700"
                        }`}
                      >
                        <span>{b.label}</span>
                        {selected && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sheet Footer Controls */}
            <div className="p-4 border-t border-zinc-100 flex items-center gap-3 shrink-0 bg-white">
              <button
                type="button"
                onClick={resetFilters}
                className="py-3 px-4 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs hover:bg-zinc-50"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setIsFilterSheetOpen(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 text-white font-semibold text-xs shadow-xs text-center"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
