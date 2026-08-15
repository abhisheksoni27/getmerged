"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  HelpCircle,
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

const FAQS = [
  {
    q: "Are these open-source metrics and rankings 100% free to access?",
    a: "Yes, completely free. GetMerged is built for the global developer and contributor community to make open-source contribution transparent and frictionless. You can browse, filter, inspect maintainer turnaround velocity, and track repository health without paywalls.",
  },
  {
    q: "How does GetMerged help first-time open-source contributors?",
    a: "We measure the First-Timer PR Acceptance Rate and scan for active beginner-friendly issues (good first issue, help wanted). This allows new contributors to identify projects where maintainers actively review and mentor external submissions rather than leaving PRs untouched.",
  },
  {
    q: "Why should I use C-Rank™ instead of just sorting by GitHub stars?",
    a: "GitHub stars reflect historical popularity rather than current maintainer availability. Many famous 50k+ star repositories suffer from maintainer burnout with massive unreviewed PR backlogs. C-Rank™ measures live reviewer responsiveness, external merge rates, and review turnaround times.",
  },
  {
    q: "How many welcoming repositories do you index across different languages?",
    a: "We actively evaluate over 1,400+ repositories across 20+ programming ecosystems. Our S-Tier (Super Welcoming) and A-Tier (Welcoming) catalog includes 350+ JavaScript & TypeScript projects, 280+ Python repos, 190+ Go tools, 120+ Rust systems, alongside high-velocity repositories in Java, C++, PHP, Kotlin, Swift, and more.",
  },
  {
    q: "Does GetMerged track private code or require repository write access?",
    a: "No. All telemetry is calculated strictly from public GitHub GraphQL events and public pull request activity without requesting code access or write permissions.",
  },
  {
    q: "How are repositories evaluated in this directory?",
    a: "Every repository is benchmarked continuously using our proprietary C-Rank™ telemetry algorithm. We track real maintainer PR response turnaround, external merge rates, first-timer acceptance rates, and review friction across thousands of GitHub projects.",
  },
  {
    q: "What does the C-Rank™ tier (S, A, B, C, D) mean?",
    a: "Tier S repositories are Super Welcoming with fast maintainer response (< 24h) and high merge rates. Tier A is Welcoming, Tier B is Standard, Tier C is Selective, and Tier D indicates unmaintained backlogs or slow review times.",
  },
  {
    q: "How often is telemetry updated?",
    a: "Our automated pipeline syncs daily GraphQL and event stream snapshots. Every repository page reflects the latest snapshot timestamp directly from GitHub.",
  },
  {
    q: "Can I request my repository to be indexed or re-scored?",
    a: "Yes! Any public GitHub repository can be submitted directly through the search bar on the homepage or via our fast-track indexing queue.",
  },
];

interface ReposClientProps {
  initialRepos?: Repo[];
  initialTotal?: number;
}

export function ReposClient({ initialRepos = [], initialTotal = 0 }: ReposClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial page from URL query parameter
  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const initialPage = isNaN(urlPage) || urlPage < 1 ? 1 : urlPage;

  const [repos, setRepos] = useState<Repo[]>(initialRepos);
  const [loading, setLoading] = useState<boolean>(initialRepos.length === 0);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("q") || "");
  const [selectedLang, setSelectedLang] = useState<string>(searchParams.get("lang") || "All");
  const [selectedTier, setSelectedTier] = useState<string>(searchParams.get("tier") || "All");
  const [selectedStarBucket, setSelectedStarBucket] = useState<string>(searchParams.get("stars") || "All");
  const [selectedMergeRate, setSelectedMergeRate] = useState<string>(searchParams.get("merge_rate") || "All");
  const [selectedFirstTimer, setSelectedFirstTimer] = useState<string>(searchParams.get("first_timer") || "All");
  const [trendingOnly, setTrendingOnly] = useState<boolean>(searchParams.get("trending") === "true");

  // Pagination
  const [page, setPage] = useState<number>(initialPage);
  const [totalCount, setTotalCount] = useState<number>(initialTotal);
  const perPage = 24;

  const isInitialMount = React.useRef(true);

  // Mobile Bottom Sheet Modal State
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

  // Sync page state if URL changes
  useEffect(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    if (!isNaN(p) && p > 0 && p !== page) {
      setPage(p);
    }
  }, [searchParams, page]);

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
    router.push("/repos");
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
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialRepos.length > 0) return;
    }
    fetchRepos();
  }, [fetchRepos, initialRepos.length]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  const getPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", p.toString());
    if (selectedLang !== "All") params.set("lang", selectedLang);
    if (selectedTier !== "All") params.set("tier", selectedTier);
    if (selectedStarBucket !== "All") params.set("stars", selectedStarBucket);
    if (selectedMergeRate !== "All") params.set("merge_rate", selectedMergeRate);
    if (selectedFirstTimer !== "All") params.set("first_timer", selectedFirstTimer);
    if (trendingOnly) params.set("trending", "true");
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    const qs = params.toString();
    return qs ? `/repos?${qs}` : "/repos";
  };

  const handlePageClick = (e: React.MouseEvent, p: number) => {
    if (p > 1 && !isLoggedIn) {
      e.preventDefault();
      openAuthModal(
        "Sign In to Access Full Directory",
        "Create a free account to browse page 2+ across all 1,400+ repositories and track custom watchlists.",
        "pagination"
      );
      return;
    }
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Generate sliding pagination window (e.g. 1 2 3 4 5)
  const paginationRange = useMemo(() => {
    const current = page;
    const total = totalPages;
    const delta = 2;
    const range: number[] = [];

    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }

    if (range.length > 0 && range[0] > 1) {
      if (range[0] > 2) range.unshift(-1); // indicator for ellipsis
      range.unshift(1);
    }
    if (range.length > 0 && range[range.length - 1] < total) {
      if (range[range.length - 1] < total - 1) range.push(-2); // indicator for ellipsis
      range.push(total);
    }

    return range;
  }, [page, totalPages]);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] dev-grid-pattern text-zinc-900 overflow-x-hidden font-sans">
      <Header />

      <main className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Link href="/" title="Back to GetMerged Home" className="hover:text-zinc-900 transition-colors">
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
                {totalCount.toLocaleString()}
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
                  className="p-2.5 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer"
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
                  className="p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-600 text-xs font-semibold cursor-pointer"
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
                <RepoCard key={repo.id || repo.full_name} repo={repo} isLoggedIn={isLoggedIn} />
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

        {/* Crawlable Pagination Controls (<a> Links) */}
        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 pt-8">
            {/* Previous Page Link */}
            <Link
              href={getPageUrl(Math.max(1, page - 1))}
              onClick={(e) => handlePageClick(e, Math.max(1, page - 1))}
              title={`Go to previous page ${Math.max(1, page - 1)}`}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-2xs transition-all ${
                page <= 1 ? "pointer-events-none opacity-40" : "cursor-pointer"
              }`}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Link>

            {/* Numeric Page Links 1 2 3 4 5 */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              {paginationRange.map((p, idx) => {
                if (p < 0) {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-1.5 text-zinc-400 select-none">
                      …
                    </span>
                  );
                }
                const isCurrent = p === page;
                return (
                  <Link
                    key={p}
                    href={getPageUrl(p)}
                    onClick={(e) => handlePageClick(e, p)}
                    title={`Go to repository directory page ${p}`}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`h-9 w-9 flex items-center justify-center rounded-xl font-bold transition-all ${
                      isCurrent
                        ? "bg-zinc-950 text-white shadow-xs"
                        : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
            </div>

            {/* Next Page Link */}
            <Link
              href={getPageUrl(Math.min(totalPages, page + 1))}
              onClick={(e) => handlePageClick(e, Math.min(totalPages, page + 1))}
              title={`Go to next page ${Math.min(totalPages, page + 1)}`}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-2xs transition-all ${
                page >= totalPages ? "pointer-events-none opacity-40" : "cursor-pointer"
              }`}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>
        )}

        {/* FAQs Section */}
        <section className="mt-16 sm:mt-24 pt-12 border-t border-zinc-200/80">
          <div className="max-w-3xl mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-xs font-mono text-blue-900 font-semibold mb-2">
              <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
              <span>Frequently Asked Questions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-space text-zinc-950 tracking-tight">
              Repository Indexing & C-Rank™ FAQs
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 font-sans mt-1 leading-relaxed">
              Common questions about our real-time open-source discovery engine and contributor scores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-3xl bg-white border border-zinc-200/90 p-6 sm:p-7 shadow-xs hover:border-zinc-300 transition-colors"
              >
                <h3 className="text-sm sm:text-base font-bold font-space text-zinc-900 mb-2 leading-snug">
                  {faq.q}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 font-sans leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>
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
                className="py-3 px-4 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs hover:bg-zinc-50 cursor-pointer"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setIsFilterSheetOpen(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 text-white font-semibold text-xs shadow-xs text-center cursor-pointer"
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
