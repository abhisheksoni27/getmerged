"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

const STAR_BUCKETS = [
  { label: "All Stars", value: "All" },
  { label: "< 5k ★", value: "<5k" },
  { label: "5k - 20k ★", value: "5k-20k" },
  { label: "20k - 50k ★", value: "20k-50k" },
  { label: "50k+ ★", value: "50k+" },
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
    a: "Yes! Submit your repository via our search bar on the homepage. If it is public on GitHub, it will be automatically queued and indexed in our daily evaluation cycle.",
  },
];

interface ReposClientProps {
  initialRepos: Repo[];
  initialTotal: number;
}

export function ReposClient({ initialRepos, initialTotal }: ReposClientProps) {
  const searchParams = useSearchParams();

  // Search & Filter State from URL
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("name") || "");
  const [selectedLang, setSelectedLang] = useState<string>(searchParams.get("language") || "All");
  const [selectedTier, setSelectedTier] = useState<string>(searchParams.get("tier") || "All");
  const [selectedStarBucket, setSelectedStarBucket] = useState<string>(searchParams.get("star_bucket") || "All");
  const [selectedMergeRate, setSelectedMergeRate] = useState<string>(searchParams.get("min_merge_rate") || "All");
  const [selectedFirstTimer, setSelectedFirstTimer] = useState<string>(searchParams.get("min_first_timer") || "All");
  const [trendingOnly, setTrendingOnly] = useState<boolean>(searchParams.get("trending") === "true");

  // Pagination State
  const [page, setPage] = useState<number>(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return isNaN(p) || p < 1 ? 1 : p;
  });
  const perPage = 18;

  // Data State
  const [repos, setRepos] = useState<Repo[]>(initialRepos);
  const [totalCount, setTotalCount] = useState<number>(initialTotal);
  const [loading, setLoading] = useState<boolean>(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState<boolean>(false);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalConfig, setAuthModalConfig] = useState<{ title?: string; description?: string; source?: string }>({});

  const openAuthModal = (title?: string, description?: string, source = "repos_page") => {
    setAuthModalConfig({ title, description, source });
    setIsAuthModalOpen(true);
  };

  const isLoggedIn = useMemo(() => {
    return typeof document !== "undefined" && document.cookie.includes("opendoor_token=");
  }, []);

  // Fetch Repos Function
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

    if (selectedStarBucket === "<5k") {
      params.set("max_stars", "5000");
    } else if (selectedStarBucket === "5k-20k") {
      params.set("min_stars", "5000");
      params.set("max_stars", "20000");
    } else if (selectedStarBucket === "20k-50k") {
      params.set("min_stars", "20000");
      params.set("max_stars", "50000");
    } else if (selectedStarBucket === "50k+") {
      params.set("min_stars", "50000");
    }

    if (selectedMergeRate !== "All") {
      params.set("min_merge_rate", selectedMergeRate);
    }

    if (selectedFirstTimer !== "All") {
      params.set("min_first_timer_success_rate", selectedFirstTimer);
    }

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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedLang !== "All") count++;
    if (selectedTier !== "All") count++;
    if (selectedStarBucket !== "All") count++;
    if (selectedMergeRate !== "All") count++;
    if (selectedFirstTimer !== "All") count++;
    if (trendingOnly) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [
    selectedLang,
    selectedTier,
    selectedStarBucket,
    selectedMergeRate,
    selectedFirstTimer,
    trendingOnly,
    searchQuery,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedLang("All");
    setSelectedTier("All");
    setSelectedStarBucket("All");
    setSelectedMergeRate("All");
    setSelectedFirstTimer("All");
    setTrendingOnly(false);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range = [];
    const total = totalPages;

    for (let i = Math.max(2, page - delta); i <= Math.min(total - 1, page + delta); i++) {
      range.push(i);
    }

    if (page - delta > 2) {
      range.unshift(-1); // indicator for ellipsis
    }
    range.unshift(1);

    if (page + delta < total - 1) {
      range.push(-2); // indicator for ellipsis
    }
    if (total > 1) {
      range.push(total);
    }

    return range;
  }, [page, totalPages]);

  return (
    <div className="min-h-screen flex flex-col bg-black dev-grid-pattern text-white overflow-x-hidden font-sans">
      <Header />

      <main className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-zinc-300">
          <Link href="/" title="Back to GetMerged Home" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-white font-semibold">Repository Directory</span>
        </nav>

        {/* Header Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-white/[0.1] pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-mono text-orange-400 font-bold mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>C-Rank™ Scored Repositories</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-space text-white tracking-tight leading-tight">
              Open-Source Repository Explorer
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 font-sans mt-3 max-w-2xl leading-relaxed">
              Browse public GitHub repositories scored on merge velocity, maintainer responsiveness, and first-time PR welcome rates.
            </p>
          </div>

          {/* Quick Counter Badge */}
          <div className="flex items-center gap-3.5 glass-panel rounded-2xl px-6 py-4 shadow-lg shrink-0 self-start md:self-auto">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <div>
              <span className="block text-[11px] font-mono text-zinc-300 uppercase tracking-wider font-semibold">
                Total Repositories
              </span>
              <span className="text-2xl font-bold font-mono text-white">
                {totalCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <section className="glass-panel rounded-3xl p-5 sm:p-6 shadow-xl mb-10">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by repo name (e.g. facebook/react, fastapi)..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-black/70 border border-white/[0.12] text-sm text-white placeholder:text-zinc-300 focus:outline-hidden focus:border-white/[0.3] transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-300 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Desktop Filters Row */}
            <div className="hidden lg:flex items-center gap-3 text-xs">
              {/* Language Select */}
              <select
                value={selectedLang}
                onChange={(e) => {
                  setSelectedLang(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by language"
                className="px-3.5 py-3 rounded-xl bg-black/70 border border-white/[0.12] text-zinc-200 font-semibold focus:border-white/[0.3] cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l} className="glass-card text-white">
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
                className="px-3.5 py-3 rounded-xl bg-black/70 border border-white/[0.12] text-zinc-200 font-semibold focus:border-white/[0.3] cursor-pointer"
              >
                <option value="All" className="glass-card text-white">All Tiers (S–D)</option>
                <option value="S" className="glass-card text-white">Tier S (Elite)</option>
                <option value="A" className="glass-card text-white">Tier A (Welcoming)</option>
                <option value="B" className="glass-card text-white">Tier B (Solid)</option>
                <option value="C" className="glass-card text-white">Tier C (Moderate)</option>
                <option value="D" className="glass-card text-white">Tier D (Risky)</option>
              </select>

              {/* Star Volume Select */}
              <select
                value={selectedStarBucket}
                onChange={(e) => {
                  setSelectedStarBucket(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by stars"
                className="px-3.5 py-3 rounded-xl bg-black/70 border border-white/[0.12] text-zinc-200 font-semibold focus:border-white/[0.3] cursor-pointer"
              >
                {STAR_BUCKETS.map((b) => (
                  <option key={b.value} value={b.value} className="glass-card text-white">
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
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border transition-all cursor-pointer font-bold ${
                  trendingOnly
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm"
                    : "bg-black/70 border-white/[0.12] text-zinc-300 hover:text-white"
                }`}
              >
                <Flame className={`h-4 w-4 ${trendingOnly ? "text-amber-400 fill-amber-400" : "text-zinc-300"}`} />
                <span>Trending</span>
              </button>

              {/* Reset button if filters active */}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  title="Reset all filters"
                  className="p-3 rounded-xl border border-white/[0.12] bg-black/70 text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mobile Filter Sheet Trigger Button */}
            <div className="flex lg:hidden items-center justify-between gap-2 pt-2 border-t border-white/[0.1]">
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/[0.1] text-white font-sans text-xs font-bold shadow-sm cursor-pointer active:scale-98 transition-transform"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</span>
              </button>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  title="Reset all filters"
                  className="p-3 rounded-xl border border-white/[0.12] bg-black/70 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Language Chips Carousel */}
          <div className="mt-4 pt-4 border-t border-white/[0.1] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-zinc-300 font-mono shrink-0 pl-1">Quick:</span>
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer font-sans shrink-0 ${
                    active
                      ? "bg-white text-zinc-950 font-bold shadow-sm"
                      : "bg-black/60 border border-white/[0.1] text-zinc-300 hover:text-white font-medium"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 rounded-3xl glass-card border border-white/[0.1] p-6 animate-pulse" />
              ))}
            </div>
          ) : repos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {repos.map((repo) => (
                <RepoCard key={repo.id || repo.full_name} repo={repo} isLoggedIn={isLoggedIn} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-3xl glass-panel border border-white/[0.1] max-w-lg mx-auto">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl glass-card border border-white/[0.1] text-zinc-300 mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold font-space text-white mb-1">
                No matching repositories found
              </h3>
              <p className="text-xs text-zinc-300 font-sans max-w-sm mx-auto mb-6">
                Try adjusting your search query, language filters, or star count parameters to explore more results.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white px-5 py-2.5 text-xs font-bold font-mono transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </section>

        {/* Pagination Bar */}
        {!loading && totalPages > 1 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.1] pt-8">
            <div className="text-xs font-mono text-zinc-300">
              Showing page <span className="text-white font-bold">{page}</span> of{" "}
              <span className="text-white font-bold">{totalPages}</span> ({totalCount.toLocaleString()} total repos)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="p-2 rounded-xl border border-white/[0.1] bg-black/60 text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((num, idx) => {
                  if (num < 0) {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 text-zinc-300 text-xs">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = num === page;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setPage(num);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`min-w-[36px] h-9 px-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-white text-zinc-950 shadow-sm"
                          : "bg-black/60 border border-white/[0.1] text-zinc-300 hover:text-white hover:border-white/[0.2]"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="p-2 rounded-xl border border-white/[0.1] bg-black/60 text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                aria-label="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Directory FAQ Section */}
        <section className="mt-16 pt-12 border-t border-white/[0.1]">
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold font-space text-white">
              Frequently Asked Questions About Open-Source Rankings
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1">
              Everything you need to know about how C-Rank™ benchmarks repository maintainer availability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="glass-panel p-6 rounded-2xl space-y-2">
                <h3 className="text-sm font-bold font-space text-white flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title={authModalConfig.title}
        description={authModalConfig.description}
      />
    </div>
  );
}
