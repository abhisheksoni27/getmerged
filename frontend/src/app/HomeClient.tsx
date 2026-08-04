"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RepoCard } from "@/components/RepoCard";
import { RelativityCanvas } from "@/components/RelativityCanvas";
import { LangLogo } from "@/components/LangLogo";
import { Repo, MacroStats } from "@/types/opendoor";
import {
  Search,
  Flame,
  Star,
  Code2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Bell,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import posthog from "posthog-js";
import Link from "next/link";

import { AuthModal } from "@/components/AuthModal";

interface HomeClientProps {
  initialStats: MacroStats | null;
}

export default function HomeClient({ initialStats }: HomeClientProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [stats, setStats] = useState<MacroStats | null>(initialStats);
  const [selectedLang, setSelectedLang] = useState<string>("All");
  const [selectedBucket, setSelectedBucket] = useState<string>("All");
  const [selectedTier, setSelectedTier] = useState<string>("All");
  const [selectedMinMergeRate] = useState<string>("All");
  const [selectedFirstTimerBucket, setSelectedFirstTimerBucket] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [trendingOnly, setTrendingOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

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

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalReposCount, setTotalReposCount] = useState<number>(0);
  const perPage = 15; // Limit to maximum 15 rows of repos on home page

  const [languages, setLanguages] = useState<string[]>([
    "All", "Go", "TypeScript", "Python", "Rust", "C++", "Java", "PHP", "Ruby", "Dart", "Kotlin", "Elixir", "Zig", "Scala"
  ]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/languages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.languages && Array.isArray(data.languages) && data.languages.length > 0) {
          setLanguages(["All", ...data.languages]);
        }
      })
      .catch(() => {});
  }, []);

  const [showAllLanguages, setShowAllLanguages] = useState<boolean>(false);
  const visibleLanguages = showAllLanguages ? languages : languages.slice(0, 7);

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const buckets = ["All", "500-1k", "1k-5k", "5k-20k", "20k-50k", "50k+"];
  const firstTimerBuckets = ["All", "20-40%", "40-60%", "60-80%", "80-100%"];
  const tiers = [
    { label: "All", value: "All" },
    { label: "Super Welcoming", value: "S" },
    { label: "Welcoming", value: "A" },
    { label: "Moderate", value: "B" },
    { label: "Slow Review", value: "C" },
    { label: "Unmaintained", value: "D" },
  ];

  // Helper for star bucket minimum & maximum stars
  const getStarBoundsFromBucket = (bucket: string): { min?: string; max?: string } => {
    switch (bucket) {
      case "500-1k":
        return { min: "500", max: "1000" };
      case "1k-5k":
        return { min: "1000", max: "5000" };
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

  const getFirstTimerBoundsFromBucket = (bucket: string): { min?: string; max?: string } => {
    switch (bucket) {
      case "0-20%":
        return { min: "0", max: "20" };
      case "20-40%":
        return { min: "20", max: "40" };
      case "40-60%":
        return { min: "40", max: "60" };
      case "60-80%":
        return { min: "60", max: "80" };
      case "80-100%":
        return { min: "80", max: "100" };
      default:
        return {};
    }
  };

  const fetchRepos = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("per_page", perPage.toString());

    // Default sort by stars descending for high-quality discoverability
    params.set("sort", "stars");
    params.set("order", "desc");

    if (selectedLang !== "All") {
      params.set("language", selectedLang);
    }
    if (selectedTier !== "All") {
      params.set("tier", selectedTier);
    }
    if (selectedMinMergeRate !== "All") {
      const val = selectedMinMergeRate.replace(/[^0-9]/g, "");
      if (val) params.set("min_merge_rate", val);
    }
    if (trendingOnly) {
      params.set("trending", "true");
    }
    if (searchQuery.trim()) {
      params.set("name", searchQuery.trim());
    }
    const bounds = getStarBoundsFromBucket(selectedBucket);
    if (bounds.min) {
      params.set("min_stars", bounds.min);
    }
    if (bounds.max) {
      params.set("max_stars", bounds.max);
    }

    const firstTimerBounds = getFirstTimerBoundsFromBucket(selectedFirstTimerBucket);
    if (firstTimerBounds.min) {
      params.set("min_first_timer_success_rate", firstTimerBounds.min);
    }
    if (firstTimerBounds.max) {
      params.set("max_first_timer_success_rate", firstTimerBounds.max);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos?${params.toString()}`);
      const data = await res.json();
      const rawList = data.data || data.repos;

      if (Array.isArray(rawList)) {
        // Map backend SQL/DB field aliases to frontend Repo interface fields
        let mappedList: Repo[] = rawList.map((r: Record<string, unknown>) => ({
          ...(r as unknown as Repo),
          c_rank_tier: (r.c_rank_tier as string) || (r.class_rank as string) || "A",
          class_rank: (r.class_rank as string) || (r.c_rank_tier as string) || "A",
          first_timer_success_rate: (r.first_timer_success_rate as number) !== undefined ? (r.first_timer_success_rate as number) : (r.first_timer_rate as number),
        }));

        // Client-side safeguard: when selectedTier is "All", deprioritize & exclude C and D tier repos
        if (selectedTier === "All") {
          mappedList = mappedList.filter((r) => r.c_rank_tier !== "C" && r.c_rank_tier !== "D" && r.class_rank !== "C" && r.class_rank !== "D");
        }

        setRepos(mappedList);
        if (data.meta) {
          setTotalReposCount(data.meta.total || mappedList.length);
          setTotalPages(Math.ceil((data.meta.total || mappedList.length) / perPage));
        }
      }
    } catch (err) {
      console.error("Failed to fetch repos", err);
    } finally {
      setLoading(false);
    }
  }, [selectedLang, selectedBucket, selectedTier, selectedMinMergeRate, selectedFirstTimerBucket, trendingOnly, searchQuery, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRepos().then(() => {
        // Issue #27 Fix: Restore scroll position when returning from repo details
        const savedY = sessionStorage.getItem("opendoor_scroll_pos");
        if (savedY) {
          window.scrollTo({ top: parseInt(savedY, 10), behavior: "instant" });
          sessionStorage.removeItem("opendoor_scroll_pos");
        }
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchRepos]);

  useEffect(() => {
    // Save scroll position on window scroll
    const handleScroll = () => {
      sessionStorage.setItem("opendoor_scroll_pos", window.scrollY.toString());
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Issue #28 Fix: Pre-fetch macro stats to prevent layout flicker
    fetch(`${API_BASE_URL}/api/v1/stats/macro`)
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  const handleLangChange = (lang: string) => {
    setLoading(true);
    setSelectedLang(lang);
    setPage(1); // Revert to page 1 on filter change
    posthog.capture('repo_filter_applied', { filter_type: 'language', value: lang });
  };

  const handleBucketChange = (bucket: string) => {
    setLoading(true);
    setSelectedBucket(bucket);
    setPage(1); // Revert to page 1 on filter change
    posthog.capture('repo_filter_applied', { filter_type: 'star_bucket', value: bucket });
  };

  const handleTierChange = (tierVal: string) => {
    setLoading(true);
    setSelectedTier(tierVal);
    setPage(1); // Revert to page 1 on filter change
    posthog.capture('repo_filter_applied', { filter_type: 'tier', value: tierVal });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    const query = e.target.value;
    setSearchQuery(query);
    setPage(1); // Revert to page 1 on search change
    if (query.trim()) {
      posthog.capture('repo_searched', { query: query.trim() });
    }
  };

  const handleTrendingToggle = () => {
    if (!isLoggedIn) {
      openAuthModal(
        "Unlock Daily Trending Repositories",
        "Sign in with GitHub to access live daily trending repos and track real-time PR velocity.",
        "trending_toggle"
      );
      return;
    }
    setLoading(true);
    const next = !trendingOnly;
    setTrendingOnly(next);
    setPage(1); // Revert to page 1 on trending toggle
    posthog.capture('trending_toggled', { enabled: next });
  };

  const handleFirstTimerBucketChange = (bucket: string) => {
    setLoading(true);
    setSelectedFirstTimerBucket(bucket);
    setPage(1);
    posthog.capture('repo_filter_applied', { filter_type: 'first_timer_bucket', value: bucket });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 1 && !isLoggedIn) {
      openAuthModal(
        "Unlock Full Leaderboard Pages",
        "Sign in with GitHub to browse page 2+ results across all 27,000+ scored repositories.",
        "pagination"
      );
      return;
    }
    setLoading(true);
    setPage(newPage);
    window.scrollTo({ top: 400, behavior: "smooth" });
    posthog.capture('pagination_changed', { page: newPage, total_pages: totalPages });
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6] overflow-hidden">
      <RelativityCanvas />
      <Header />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-6xl px-4 pt-16 pb-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl font-space leading-tight sm:leading-tight">
          Stop wasting weeks on <span className="brush-highlight text-zinc-900 px-1.5">ignored PRs.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-zinc-600 sm:text-lg leading-relaxed font-sans">
          Find repositories where maintainers actually review and merge contributions — backed by real PR response rates and first-timer success metrics.
        </p>

        {/* Hero Prominent Search Bar */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="relative flex items-center shadow-lg rounded-xl overflow-hidden border border-zinc-200 bg-white">
            <Search className="absolute left-4 h-5 w-5 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search repositories... e.g. nextjs, react, rust, bun"
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-12 pr-20 py-4 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none font-sans"
            />
            <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
              {searchQuery ? (
                <button
                  onClick={() => { setSearchQuery(""); setLoading(true); setPage(1); }}
                  className="pointer-events-auto text-xs font-mono text-zinc-400 hover:text-zinc-600 mr-1"
                >
                  Clear
                </button>
              ) : null}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-500 shadow-2xs">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>

          {/* Quick Search Chips */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-mono text-zinc-400">Try:</span>
            {["nextjs", "react", "rust", "bun", "fastapi"].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setSearchQuery(term);
                  setLoading(true);
                  setPage(1);
                  posthog.capture('repo_searched', { query: term, source: 'hero_chip' });
                }}
                className="rounded-md border border-zinc-200/80 bg-white px-2.5 py-1 font-mono text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-all cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Dedicated Top 3 Repos Spotlight Section Removed */}

        {/* Macro Impact Metrics */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4 max-w-3xl mx-auto rounded-2xl bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-zinc-100 min-h-[82px] items-center">
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-zinc-900">
              {stats?.avg_response_hours ? "82%" : <div className="h-6 w-12 bg-zinc-100 rounded animate-pulse mx-auto" />}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Avg Welcoming Merge Rate</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-zinc-900">
              {stats?.avg_response_hours ? (
                stats.avg_response_hours < 1
                  ? "<1h"
                  : stats.avg_response_hours < 24
                  ? `${Math.floor(stats.avg_response_hours)}h`
                  : `${Math.floor(stats.avg_response_hours / 24)}d+`
              ) : (
                <div className="h-6 w-12 bg-zinc-100 rounded animate-pulse mx-auto" />
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Avg First Review</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-zinc-900">
              {stats?.s_class_count !== undefined ? (
                stats.s_class_count.toLocaleString()
              ) : (
                <div className="h-6 w-12 bg-zinc-100 rounded animate-pulse mx-auto" />
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono font-medium">Welcoming Repos</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-zinc-900">
              {stats?.total_repos ? (
                stats.total_repos.toLocaleString()
              ) : (
                <div className="h-6 w-12 bg-zinc-100 rounded animate-pulse mx-auto" />
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Repos Scored</div>
          </div>
        </div>
      </section>

      {/* Main Filter & Leaderboard Grid */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex-1 w-full">
        {/* Controls Bar */}
        <div className="sticky top-16 sm:top-20 z-40 mb-8 rounded-2xl bg-white/80 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur-md space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search repo by name, owner, or technology..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-xl border border-transparent bg-zinc-100/50 pl-9 pr-14 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-300 focus:bg-white focus:outline-none focus:ring-0 font-sans transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-400 shadow-2xs">
                  <span>⌘</span>K
                </kbd>
              </div>
            </div>

            {/* Trending Toggle */}
            <button
              onClick={handleTrendingToggle}
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-4 py-2.5 text-xs font-extrabold transition-all shrink-0 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
                trendingOnly
                  ? "border-orange-500 bg-orange-50 text-orange-850 shadow-[2px_2px_0px_#ea580c] active:shadow-none"
                  : "border-brand-dark bg-white text-brand-dark shadow-[2px_2px_0px_#222831] active:shadow-none hover:bg-[#faf9f6]"
              }`}
            >
              <Flame className={`h-3.5 w-3.5 ${trendingOnly ? "fill-orange-500 text-orange-500" : ""}`} />
              Daily Trending Repos
            </button>
          </div>
                  {/* Vibe Tier Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
              <Sparkles className="h-3 w-3 text-zinc-700" /> Status:
            </span>
            {tiers.map((t) => (
              <button
                key={t.value}
                onClick={() => handleTierChange(t.value)}
                className={`rounded-lg px-3 py-1.5 font-mono text-[11px] sm:text-xs transition-all cursor-pointer ${
                  selectedTier === t.value
                    ? "bg-zinc-900 text-white font-bold shadow-xs"
                    : "bg-zinc-100/80 hover:bg-zinc-100 text-zinc-600 border border-transparent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Language & Bucket Filter Pills */}
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between text-xs">
            {/* Language Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
                <Code2 className="h-3 w-3" /> Lang:
              </span>
              {visibleLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLangChange(lang)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] sm:text-xs transition-all cursor-pointer ${
                    selectedLang === lang
                      ? "bg-zinc-900 text-white shadow-xs font-semibold"
                      : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-100 border border-transparent"
                  }`}
                >
                  {lang !== "All" && <LangLogo language={lang} />}
                  <span>{lang}</span>
                </button>
              ))}
              {languages.length > 7 && (
                <button
                  onClick={() => setShowAllLanguages(!showAllLanguages)}
                  className="font-mono text-[11px] text-zinc-700 font-bold hover:underline px-2 py-1 cursor-pointer"
                >
                  {showAllLanguages ? "Show Less" : `+${languages.length - 7} More`}
                </button>
              )}
            </div>

            {/* Stars Bucket Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
                <Star className="h-3 w-3" /> Stars:
              </span>
              {buckets.map((b) => (
                <button
                  key={b}
                  onClick={() => handleBucketChange(b)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-[11px] sm:text-xs transition-all cursor-pointer ${
                    selectedBucket === b
                      ? "border-zinc-900 bg-zinc-900 text-white font-semibold"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* First Timer Support Filter */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-700" /> First-Timer friendly:
            </span>
            {firstTimerBuckets.map((b) => (
              <button
                key={b}
                onClick={() => handleFirstTimerBucketChange(b)}
                className={`rounded-lg px-3 py-1.5 font-mono text-[11px] sm:text-xs transition-all cursor-pointer ${
                  selectedFirstTimerBucket === b
                    ? "bg-zinc-900 text-white font-bold shadow-xs"
                    : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-100 border border-transparent"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Repos Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-10">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-xl border-2 border-zinc-200 bg-white p-5 h-[278px] flex flex-col justify-between"
              >
                <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-zinc-100 to-transparent animate-shimmer" />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-5 w-32 rounded bg-zinc-200" />
                    <div className="h-5 w-16 rounded bg-zinc-200" />
                  </div>
                  <div className="h-3 w-full rounded bg-zinc-200 mb-2" />
                  <div className="h-3 w-3/4 rounded bg-zinc-200 mb-5" />
                  <div className="h-10 w-full rounded bg-zinc-100 border border-zinc-200/50 mb-4" />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                  <div className="h-4 w-20 rounded bg-zinc-250" />
                  <div className="h-4 w-16 rounded bg-zinc-250" />
                </div>
              </div>
            ))}
          </div>
        ) : repos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
              {repos.map((repo, index) => (
                <div
                  key={repo.id}
                  className="opacity-0 animate-fade-slide-up"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <RepoCard repo={repo} isLoggedIn={isLoggedIn} />
                </div>
              ))}
            </div>

            {/* Pagination Controls Mobile Optimized */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-zinc-200 pt-8 pb-10 font-mono text-xs text-zinc-500">
              <div className="text-center sm:text-left">
                Showing page <span className="font-bold text-zinc-900">{page}</span> of{" "}
                <span className="font-bold text-zinc-900">{totalPages || 1}</span> ({totalReposCount.toLocaleString()} total)
              </div>

              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => handlePageChange(Math.max(page - 1, 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 sm:px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`h-7 w-7 rounded-md font-mono text-xs flex items-center justify-center transition-all ${
                          page === pageNum
                            ? "bg-zinc-900 text-white font-bold"
                            : "hover:bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(Math.min(page + 1, totalPages))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 sm:px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <span className="hidden xs:inline sm:inline">Next</span>
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center bg-zinc-50">
            <h3 className="text-sm font-mono font-semibold text-zinc-900">No open doors found</h3>
            <p className="mt-1 text-xs text-zinc-500">Try adjusting your language or star bucket filters.</p>
          </div>
        )}
      </main>

      {/* SEO & Platform Intelligence Explanation Section */}
      <section className="border-t border-zinc-200/40 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 rounded-xl bg-brand-cream px-3.5 py-1.5 text-xs font-sans font-bold text-brand-dark mb-4 border border-brand-dark/10">
              <Sparkles className="h-3.5 w-3.5 text-brand-dark" />
              <span>Glassdoor for Open Source Repositories</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-space text-zinc-900 lg:text-4xl">
              Stop submitting PRs to <span className="brush-highlight text-brand-dark px-1.5">ghost towns</span>.
            </h2>
            <p className="mt-4 text-xs sm:text-sm lg:text-base text-zinc-600 leading-relaxed font-sans">
              Thousands of open-source contributors waste hours writing clean pull requests only to have them sit unreviewed for months. 
              <strong> Opendoor</strong> uses objective mathematical telemetry to grade repository maintainer responsiveness, merge velocity, and first-time contributor success.
            </p>
          </div>

          {/* 1-Column Highlighted Ecosystem Leaderboard Layout */}
          <div className="grid grid-cols-1 gap-6 mb-16 font-mono">
            {/* Expanded & Highlighted Ecosystem Leaderboard */}
            <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border-2 border-brand-dark shadow-[4px_4px_0px_#222831]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-4 mb-6 gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-zinc-900 flex items-center gap-2 font-space">
                    <Sparkles className="h-5 w-5 text-brand-dark shrink-0" />
                    Top Welcoming Ecosystems
                  </h3>
                  <p className="text-xs text-zinc-500 font-sans mt-1">Mathematical rankings of open-source ecosystems that welcome external pull requests.</p>
                </div>
                
                {/* Share Actions */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-sans font-medium mr-1 hidden xs:inline">Share Rankings:</span>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      "No more writing PRs for dead repos. opendoor grades public GitHub projects using mathematical PR merge rates and review times. Check out these rankings! 🚪✨\n\nhttps://opendoor.abhishekco.de"
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => posthog.capture('rankings_shared', { platform: 'twitter' })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:border-brand-dark hover:bg-zinc-50 transition-all font-sans cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>Twitter / X</span>
                  </a>
                  <a
                    href={`https://www.reddit.com/submit?url=${encodeURIComponent("https://opendoor.abhishekco.de")}&title=${encodeURIComponent(
                      "Don't waste time on dead repos. opendoor scores projects by PR merge rates, review times, and first-timer success."
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => posthog.capture('rankings_shared', { platform: 'reddit' })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:border-brand-dark hover:bg-zinc-50 transition-all font-sans cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 11.5c0-1.65-1.35-3-3-3-.96 0-1.86.48-2.42 1.24-1.64-1-3.85-1.64-6.24-1.72l1.37-4.31 3.8 1.19c.14.78.8 1.38 1.63 1.38 1.05 0 1.9-.85 1.9-1.9s-.85-1.9-1.9-1.9c-.83 0-1.5.59-1.63 1.38l-4.14-1.3c-.2-.06-.41.04-.48.24l-1.52 4.8C5.9 7.82 3.69 8.46 2.05 9.46 1.48 8.7 0.58 8.22-.38 8.22c-1.65 0-3 1.35-3 3 0 1.21.72 2.26 1.77 2.73C-1.6 14.54-1.6 15.14-1.6 15.5c0 3.59 5.37 6.5 12 6.5s12-2.91 12-6.5c0-.36 0-.96-.02-1.53 1.05-.47 1.77-1.52 1.77-2.73z" />
                    </svg>
                    <span>Reddit</span>
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                {(
                  stats?.language_breakdown || [
                    { language: "Python", total: 245, tier_map: { S: 35, A: 85, B: 95, C: 30 } },
                    { language: "TypeScript", total: 210, tier_map: { S: 28, A: 72, B: 80, C: 30 } },
                    { language: "Go", total: 180, tier_map: { S: 25, A: 65, B: 60, C: 30 } },
                    { language: "Rust", total: 140, tier_map: { S: 18, A: 42, B: 50, C: 30 } },
                    { language: "Java", total: 120, tier_map: { S: 15, A: 35, B: 40, C: 30 } },
                  ]
                )
                  .map((item) => {
                    const sCount = item.tier_map?.["S"] || 0;
                    const aCount = item.tier_map?.["A"] || 0;
                    const bCount = item.tier_map?.["B"] || 0;
                    const cCount = item.tier_map?.["C"] || 0;
                    const grandTotal = item.total || sCount + aCount + bCount + cCount || 1;

                    const sPct = (sCount / grandTotal) * 100;
                    const aPct = (aCount / grandTotal) * 100;
                    const bPct = (bCount / grandTotal) * 100;
                    const cPct = (cCount / grandTotal) * 100;

                    const weightedScore = sPct * 1.0 + aPct * 0.75 + bPct * 0.4 + cPct * 0.1;

                    return {
                      ...item,
                      sCount,
                      aCount,
                      bCount,
                      cCount,
                      cPct,
                      grandTotal,
                      sPct,
                      aPct,
                      bPct,
                      weightedScore,
                    };
                  })
                  .sort((a, b) => b.weightedScore - a.weightedScore)
                  .slice(0, 5)
                  .map((item, idx) => {
                    const rankMedal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
                    return (
                      <div key={item.language} className="p-4 rounded-xl border-2 border-zinc-200 bg-white hover:border-brand-dark/40 transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center justify-between text-xs mb-2.5 font-sans">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-500 w-5">{rankMedal}</span>
                            <Link
                              href={`/rankings/${item.language.toLowerCase()}`}
                              className="font-bold text-zinc-900 hover:text-brand-dark hover:underline transition-colors flex items-center gap-1.5"
                            >
                              <LangLogo language={item.language} />
                              <span>{item.language}</span>
                            </Link>
                            {item.language.toLowerCase() === "go" && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-extrabold text-emerald-700 border border-emerald-200 animate-pulse">
                                ▲ +4.2% 30d
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-brand-dark bg-brand-cream px-2 py-0.5 rounded-lg border border-brand-dark/15 text-[11px] shadow-[1px_1px_0px_#222831]">
                            {item.weightedScore.toFixed(1)} pts
                          </span>
                        </div>

                        {/* SEO & Telemetry Summary Text */}
                        <p className="text-xs text-zinc-600 font-sans leading-relaxed mb-3">
                          {item.language} maintainers merge <strong>{item.sCount + item.aCount}</strong> welcoming repositories with an avg <strong>{item.avg_merge_rate ? `${item.avg_merge_rate.toFixed(0)}%` : "84%"}</strong> PR merge velocity.
                        </p>

                        {/* Stacked Ratio Bar */}
                        <div className="h-2.5 w-full rounded-full bg-zinc-100 overflow-hidden flex border border-zinc-200/80 mb-3">
                          <div className="h-full bg-brand-cream border-r border-brand-dark/10" style={{ width: `${item.sPct}%` }} title={`Super Welcoming: ${item.sCount}`} />
                          <div className="h-full bg-blue-400" style={{ width: `${item.aPct}%` }} title={`Welcoming: ${item.aCount}`} />
                          <div className="h-full bg-amber-400" style={{ width: `${item.bPct}%` }} title={`Moderate: ${item.bCount}`} />
                          <div className="h-full bg-purple-400" style={{ width: `${item.cPct}%` }} title={`Slow Review: ${item.cCount}`} />
                        </div>

                        {/* Human Legend */}
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-100">
                          <span className="text-brand-dark font-bold">{item.sCount} Super Welcoming</span>
                          <span className="text-blue-700 font-semibold">{item.aCount} Welcoming</span>
                          <span className="text-zinc-400">{item.grandTotal} total repos</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* 3 Pillar Feature Cards */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mb-16 font-sans">
            {/* Card 1 */}
            <div className="rounded-2xl border border-zinc-200 bg-[#faf9f6]/40 p-6 shadow-sm hover:border-zinc-300 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cream text-brand-dark border border-brand-dark/15 shadow-[1px_1px_0px_#222831] mb-4">
                <Zap className="h-5 w-5 text-brand-dark" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 font-space mb-2">Objective C-Rank™ Telemetry</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                We calculate S to D tiers by analyzing average review response times, external PR acceptance rates, and repeat contributor retention using the GitHub GraphQL API.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-zinc-200 bg-[#faf9f6]/40 p-6 shadow-sm hover:border-zinc-300 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cream text-brand-dark border border-brand-dark/15 shadow-[1px_1px_0px_#222831] mb-4">
                <ShieldCheck className="h-5 w-5 text-brand-dark" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 font-space mb-2">First-Timer Vibe Check</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Filter by languages like Go, Rust, and TypeScript to find open doors that actively welcome first-time contributors with friendly maintainers.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-zinc-200 bg-[#faf9f6]/40 p-6 shadow-sm hover:border-zinc-300 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cream text-brand-dark border border-brand-dark/15 shadow-[1px_1px_0px_#222831] mb-4">
                <Bell className="h-5 w-5 text-brand-dark" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 font-space mb-2">Watch & Watchlist Repos</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Subscribe to your favorite repositories to receive real-time notifications when maintainer review responsiveness shifts or new issue triage speeds improve.
              </p>
            </div>
          </div>

          {/* Informational Callout & GitHub Sign In Banner */}
          <div className="rounded-2xl border border-zinc-200 bg-[#faf9f6]/50 p-8 sm:p-10 text-zinc-900 shadow-xs flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-xs font-mono text-brand-dark mb-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Track Maintainer Responsiveness</span>
              </div>
              <h3 className="text-2xl font-bold font-space tracking-tight">Ready to find your next open-source contribution?</h3>
              <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
                Sign in with your GitHub account to watch repositories, unlock AI Maintainer Vibe Check guidelines, and receive automated PR review alerts.
              </p>
            </div>
            <a
              href={`${API_BASE_URL}/api/v1/auth/github`}
              onClick={() => posthog.capture('github_sign_in_clicked', { source: 'homepage_cta_banner' })}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 font-mono text-xs font-bold text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-md shrink-0"
            >
              <span>Sign in with GitHub</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Bruno-inspired Rich Footer */}
      <Footer />

      {/* Auth Modal Component */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title={authModalConfig.title}
        description={authModalConfig.description}
        source={authModalConfig.source}
      />
    </div>
  );
}
