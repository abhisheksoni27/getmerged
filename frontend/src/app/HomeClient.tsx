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
  Filter,
  Code2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Bell,
  CheckCircle2,
  ArrowRight,
  Users,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import posthog from "posthog-js";
import Link from "next/link";

interface HomeClientProps {
  initialStats: MacroStats | null;
}

export default function HomeClient({ initialStats }: HomeClientProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [stats, setStats] = useState<MacroStats | null>(initialStats);
  const [selectedLang, setSelectedLang] = useState<string>("All");
  const [selectedBucket, setSelectedBucket] = useState<string>("All");
  const [selectedTier, setSelectedTier] = useState<string>("All");
  const [selectedMinMergeRate, setSelectedMinMergeRate] = useState<string>("All");
  const [selectedFirstTimerBucket, setSelectedFirstTimerBucket] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [trendingOnly, setTrendingOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

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
  const buckets = ["All", "500-1k", "1k-5k", "5k-20k", "20k-50k", "50k+"];
  const mergeRateOptions = ["All", ">75% Merged", ">50% Merged", ">25% Merged"];
  const firstTimerBuckets = ["All", "0-20%", "20-40%", "40-60%", "60-80%", "80-100%"];
  const tiers = [
    { label: "All", value: "All" },
    { label: "Super Welcoming", value: "S" },
    { label: "Welcoming", value: "A" },
    { label: "Moderate", value: "B" },
    { label: "Slow Review", value: "C" },
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
        return { min: "0", max: "0.2" };
      case "20-40%":
        return { min: "0.2", max: "0.4" };
      case "40-60%":
        return { min: "0.4", max: "0.6" };
      case "60-80%":
        return { min: "0.6", max: "0.8" };
      case "80-100%":
        return { min: "0.8", max: "1.0" };
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
        setRepos(rawList);
        if (data.meta) {
          setTotalReposCount(data.meta.total || rawList.length);
          setTotalPages(Math.ceil((data.meta.total || rawList.length) / perPage));
        }
      }
    } catch (err) {
      console.error("Failed to fetch repos", err);
    } finally {
      setLoading(false);
    }
  }, [selectedLang, selectedBucket, selectedTier, selectedFirstTimerBucket, trendingOnly, searchQuery, page]);

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
    // Background refresh keeps client-side data fresh without shimmer
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
    setLoading(true);
    setPage(newPage);
    window.scrollTo({ top: 400, behavior: "smooth" });
    posthog.capture('pagination_changed', { page: newPage, total_pages: totalPages });
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-white overflow-hidden">
      <RelativityCanvas />
      <Header />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-4 pt-16 pb-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl font-mono">
          Find open-source repos that <span className="text-emerald-600">actually merge</span> your PRs.
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-base text-zinc-600 sm:text-lg leading-relaxed font-sans">
          Think of it as <strong>Glassdoor for open-source</strong>: opendoor scores public GitHub repositories using proprietary <strong>C-Rank™</strong> metrics based on objective PR merge rates, response speeds, and first-timer maintainer vibes.
        </p>

        {/* Macro Metrics Bar */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4 max-w-3xl mx-auto rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-xs">
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900">
              {stats?.total_repos ? stats.total_repos.toLocaleString() : totalReposCount > 0 ? totalReposCount.toLocaleString() : "—"}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Repos Scored</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600">
              {stats?.s_class_count !== undefined ? stats.s_class_count : stats?.rank_counts?.["S"] !== undefined ? stats.rank_counts["S"] : "—"}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Super Welcoming</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900">
              {stats?.languages_count ? `${stats.languages_count}+` : "—"}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Languages Covered</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900">
              {stats?.avg_response_hours ? (
                stats.avg_response_hours < 1
                  ? "<1h"
                  : stats.avg_response_hours < 24
                  ? `${Math.floor(stats.avg_response_hours)}h`
                  : `${Math.floor(stats.avg_response_hours / 24)}d+`
              ) : (
                "—"
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Avg First Review</div>
          </div>
        </div>
      </section>

      {/* Main Filter & Leaderboard Grid */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex-1 w-full">
        {/* Controls Bar */}
        <div className="sticky top-16 sm:top-20 z-40 mb-6 sm:mb-8 rounded-xl border border-zinc-200 bg-white/95 p-3 sm:p-4 shadow-sm backdrop-blur-md space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search repo by name, owner, or technology..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 pl-9 pr-4 py-2 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono transition-all"
              />
            </div>

            {/* Trending Toggle */}
            <button
              onClick={handleTrendingToggle}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all shrink-0 ${
                trendingOnly
                  ? "border-orange-300 bg-orange-50 text-orange-700 shadow-xs"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <Flame className={`h-3.5 w-3.5 ${trendingOnly ? "fill-orange-500 text-orange-500" : ""}`} />
              Daily Trending Repos
            </button>
          </div>

          {/* Vibe Tier Pills */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3 text-xs">
            <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
              <Sparkles className="h-3 w-3 text-emerald-600" /> Vibe:
            </span>
            {tiers.map((t) => (
              <button
                key={t.value}
                onClick={() => handleTierChange(t.value)}
                className={`rounded-md px-2.5 py-1 font-mono text-[11px] sm:text-xs active:scale-95 transition-all ${
                  selectedTier === t.value
                    ? t.value === "S"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : t.value === "A"
                      ? "bg-blue-600 text-white shadow-xs"
                      : t.value === "B"
                      ? "bg-amber-600 text-white shadow-xs"
                      : t.value === "C"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-zinc-900 text-white shadow-xs"
                    : "border border-zinc-200 bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Language & Bucket Filter Pills */}
          <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between text-xs">
            {/* Language Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
                <Code2 className="h-3 w-3" /> Lang:
              </span>
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLangChange(lang)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] sm:text-xs active:scale-95 transition-all ${
                    selectedLang === lang
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
                  }`}
                >
                  {lang !== "All" && <LangLogo language={lang} />}
                  <span>{lang}</span>
                </button>
              ))}
            </div>

            {/* Bucket Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
                <Filter className="h-3 w-3" /> Stars:
              </span>
              {buckets.map((b) => (
                <button
                  key={b}
                  onClick={() => handleBucketChange(b)}
                  className={`rounded-md px-2.5 py-1 font-mono text-[11px] sm:text-xs active:scale-95 transition-all ${
                    selectedBucket === b
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* First Timer Success Rate Pills */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3 text-xs">
            <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
              <Users className="h-3 w-3" /> First Timer:
            </span>
            {firstTimerBuckets.map((b) => (
              <button
                key={b}
                onClick={() => handleFirstTimerBucketChange(b)}
                className={`rounded-md px-2.5 py-1 font-mono text-[11px] sm:text-xs active:scale-95 transition-all ${
                  selectedFirstTimerBucket === b
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Repos Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-5 h-48 flex flex-col justify-between"
              >
                <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-5 w-32 rounded-md bg-zinc-200" />
                    <div className="h-5 w-14 rounded-md bg-zinc-200" />
                  </div>
                  <div className="h-3.5 w-full rounded-md bg-zinc-200 mb-2" />
                  <div className="h-3.5 w-3/4 rounded-md bg-zinc-200" />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-zinc-200/60">
                  <div className="h-4 w-20 rounded-md bg-zinc-200" />
                  <div className="h-4 w-24 rounded-md bg-zinc-200" />
                </div>
              </div>
            ))}
          </div>
        ) : repos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
              {repos.map((repo) => (
                <RepoCard key={repo.id} repo={repo} isLoggedIn={isLoggedIn} />
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
      <section className="border-t border-zinc-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-mono text-emerald-700 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Glassdoor for Open Source Repositories</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 lg:text-4xl">
              Stop submitting PRs to ghost towns<span className="text-emerald-500">.</span>
            </h2>
            <p className="mt-4 text-xs sm:text-sm lg:text-base text-zinc-600 leading-relaxed font-sans">
              Thousands of open-source contributors waste hours writing clean pull requests only to have them sit unreviewed for months. 
              <strong> Opendoor</strong> uses objective mathematical telemetry to grade repository maintainer responsiveness, merge velocity, and first-time contributor success.
            </p>
          </div>

          {/* 3-Column Compact Macro Visual Insights Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 font-mono">
            {/* Column 1: Compact Top 5 Ecosystem Leaderboard */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                    Top 5 Leaderboard
                  </h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                    Live
                  </span>
                </div>

                <div className="space-y-3">
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
                        <div key={item.language} className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-500 w-5">{rankMedal}</span>
                              <Link
                                href={`/rankings/${item.language.toLowerCase()}`}
                                className="font-bold text-zinc-900 hover:text-emerald-600 transition-colors flex items-center gap-1.5"
                              >
                                <LangLogo language={item.language} />
                                {item.language}
                              </Link>
                            </div>
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                              {item.weightedScore.toFixed(1)} pts
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-zinc-200 overflow-hidden flex">
                            <div className="h-full bg-emerald-500" style={{ width: `${item.sPct}%` }} />
                            <div className="h-full bg-blue-500" style={{ width: `${item.aPct}%` }} />
                            <div className="h-full bg-amber-500" style={{ width: `${item.bPct}%` }} />
                            <div className="h-full bg-purple-500" style={{ width: `${item.cPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Column 2: Most Welcoming Ecosystems (Most S & A Class Repos) */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                    Most Welcoming Tech Stacks
                  </h3>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                    S & A Tier Focus
                  </span>
                </div>

                <div className="space-y-3">
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
                      const welcomingTotal = sCount + aCount;
                      return { ...item, sCount, aCount, welcomingTotal };
                    })
                    .sort((a, b) => b.welcomingTotal - a.welcomingTotal)
                    .slice(0, 5)
                    .map((item) => (
                      <div key={item.language} className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <LangLogo language={item.language} />
                          <Link href={`/rankings/${item.language.toLowerCase()}`} className="font-bold text-zinc-900 hover:text-blue-600 transition-colors">
                            {item.language}
                          </Link>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {item.sCount} S-Tier
                          </span>
                          <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {item.aCount} A-Tier
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Column 3: Live Telemetry Scan Summary */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900 text-white p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                    <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
                    Live Repos Scanned
                  </h3>
                  <span className="text-[10px] bg-emerald-400/20 text-emerald-300 font-mono font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Realtime API
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold font-mono text-white">
                      {stats?.total_repos ? stats.total_repos.toLocaleString() : totalReposCount > 0 ? totalReposCount.toLocaleString() : "4,556"}
                    </div>
                    <div className="text-xs text-zinc-400 font-sans mt-0.5">
                      Total public GitHub repositories indexed & continuously scored.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-zinc-800">
                    <div className="bg-zinc-800/80 p-2.5 rounded-xl border border-zinc-700">
                      <div className="text-[10px] text-emerald-400 font-bold">SUPER WELCOMING</div>
                      <div className="text-lg font-bold text-white mt-0.5">
                        {stats?.s_class_count !== undefined ? stats.s_class_count : 420}
                      </div>
                    </div>
                    <div className="bg-zinc-800/80 p-2.5 rounded-xl border border-zinc-700">
                      <div className="text-[10px] text-blue-400 font-bold">AVG RESPONSE</div>
                      <div className="text-lg font-bold text-white mt-0.5">
                        {stats?.avg_response_hours
                          ? stats.avg_response_hours < 1
                            ? "<1h"
                            : stats.avg_response_hours < 24
                            ? `${Math.floor(stats.avg_response_hours)}h`
                            : `${Math.floor(stats.avg_response_hours / 24)}d+`
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href="/status"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-mono font-bold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all border border-zinc-700"
              >
                <span>View Full System Status</span>
                <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
              </Link>
            </div>
          </div>

          {/* 3 Pillar Feature Cards */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mb-16 font-mono">
            {/* Card 1 */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-xs hover:border-zinc-300 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-4">
                <Zap className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-2">Objective C-Rank™ Telemetry</h3>
              <p className="text-xs text-zinc-600 font-sans leading-relaxed">
                We calculate S to D tiers by analyzing average review response times, external PR acceptance rates, and repeat contributor retention using the GitHub GraphQL API.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-xs hover:border-zinc-300 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-4">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-2">First-Timer Vibe Check</h3>
              <p className="text-xs text-zinc-600 font-sans leading-relaxed">
                Filter by languages like Go, Rust, and TypeScript to find open doors that actively welcome first-time contributors with friendly maintainers.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-xs hover:border-zinc-300 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-4">
                <Bell className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-2">Watch & Watchlist Repos</h3>
              <p className="text-xs text-zinc-600 font-sans leading-relaxed">
                Subscribe to your favorite repositories to receive real-time notifications when maintainer review responsiveness shifts or new issue triage speeds improve.
              </p>
            </div>
          </div>

          {/* Informational Callout & GitHub Sign In Banner */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 sm:p-10 text-zinc-900 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 mb-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Track Maintainer Responsiveness</span>
              </div>
              <h3 className="text-2xl font-bold font-mono tracking-tight">Ready to find your next open-source contribution?</h3>
              <p className="mt-2 text-xs text-zinc-600 font-sans leading-relaxed">
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
    </div>
  );
}
