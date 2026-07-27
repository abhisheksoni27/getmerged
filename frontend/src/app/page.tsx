"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
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
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import posthog from "posthog-js";
import Link from "next/link";

export default function Home() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [stats, setStats] = useState<MacroStats | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>("All");
  const [selectedBucket, setSelectedBucket] = useState<string>("All");
  const [selectedTier, setSelectedTier] = useState<string>("All");
  const [selectedMinMergeRate, setSelectedMinMergeRate] = useState<string>("All");
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

  const languages = ["All", "Go", "TypeScript", "Python", "Rust", "C++", "Java", "PHP", "Ruby", "Dart", "Kotlin", "Elixir", "Zig", "Scala"];
  const buckets = ["All", "500-1k", "1k-5k", "5k-20k", "20k-50k", "50k+"];
  const mergeRateOptions = ["All", ">75% Merged", ">50% Merged", ">25% Merged"];
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
  }, [selectedLang, selectedBucket, selectedTier, trendingOnly, searchQuery, page]);

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
    setLoading(true);
    const next = !trendingOnly;
    setTrendingOnly(next);
    setPage(1); // Revert to page 1 on trending toggle
    posthog.capture('trending_toggled', { enabled: next });
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
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4 max-w-3xl mx-auto rounded-xl border border-zinc-200 bg-white/90 p-3 sm:p-4 shadow-xs">
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900">
              {stats?.total_repos ? stats.total_repos.toLocaleString() : totalReposCount > 0 ? totalReposCount.toLocaleString() : "1,189"}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Repos Scored</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600">
              {stats?.s_class_count !== undefined ? stats.s_class_count : stats?.rank_counts?.["S"] !== undefined ? stats.rank_counts["S"] : "420"}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Super Welcoming</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900">
              {stats?.languages_count ? `${stats.languages_count}+` : "10+"}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Languages Covered</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900">
              {stats?.avg_response_hours ? `${stats.avg_response_hours.toFixed(1)}h` : "4.2h"}
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
                    : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80"
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
                      : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80"
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
                      : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-zinc-200 pt-6 font-mono text-xs text-zinc-600">
              <div className="text-center sm:text-left">
                Showing page <span className="font-bold text-zinc-900">{page}</span> of{" "}
                <span className="font-bold text-zinc-900">{totalPages || 1}</span> ({totalReposCount.toLocaleString()} total)
              </div>

              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => handlePageChange(Math.max(page - 1, 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 sm:px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 sm:px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <span className="hidden xs:inline sm:inline">Next</span>
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center bg-white">
            <h3 className="text-sm font-mono font-semibold text-zinc-900">No open doors found</h3>
            <p className="mt-1 text-xs text-zinc-500">Try adjusting your language or star bucket filters.</p>
          </div>
        )}
      </main>

      {/* SEO & Platform Intelligence Explanation Section */}
      <section className="border-t border-zinc-200 bg-zinc-50/50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-mono text-emerald-700 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Glassdoor for Open Source Repositories</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 lg:text-4xl">
              Stop submitting PRs to ghost towns<span className="text-emerald-600">.</span>
            </h2>
            <p className="mt-4 text-xs sm:text-sm lg:text-base text-zinc-600 leading-relaxed font-sans">
              Thousands of open-source contributors waste hours writing clean pull requests only to have them sit unreviewed for months. 
              <strong> Opendoor</strong> uses objective mathematical telemetry to grade repository maintainer responsiveness, merge velocity, and first-time contributor success.
            </p>
          </div>

          {/* Rich Macro Visualizations: Stacked Language-Tier Chart & Dynamic Tier Donut */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-16 font-mono">
            {/* 1. Language Leaderboard (Ranked by Weighted Contributor Score) */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                      Language Contributor Leaderboard
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                      Ecosystems ranked by weighted welcoming score (Super Welcoming=4x, Welcoming=3x, Moderate=2x, Slow=1x).
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 w-max">
                    Live Leaderboard
                  </span>
                </div>

                {/* Tier Color Legend */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-sans mb-4 bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-100">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block shrink-0" /> Super Welcoming
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-blue-500 inline-block shrink-0" /> Welcoming
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-amber-500 inline-block shrink-0" /> Moderate
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-700 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-purple-500 inline-block shrink-0" /> Slow Review
                  </span>
                </div>

                {/* Leaderboard Items */}
                <div className="space-y-3.5">
                  {(
                    stats?.language_breakdown || [
                      { language: "Python", total: 245, tier_map: { S: 35, A: 85, B: 95, C: 30 } },
                      { language: "TypeScript", total: 210, tier_map: { S: 28, A: 72, B: 80, C: 30 } },
                      { language: "Go", total: 180, tier_map: { S: 25, A: 65, B: 60, C: 30 } },
                      { language: "Rust", total: 140, tier_map: { S: 18, A: 42, B: 50, C: 30 } },
                      { language: "Java", total: 120, tier_map: { S: 15, A: 35, B: 40, C: 30 } },
                      { language: "C++", total: 95, tier_map: { S: 10, A: 30, B: 35, C: 20 } },
                      { language: "PHP", total: 80, tier_map: { S: 8, A: 25, B: 30, C: 17 } },
                      { language: "Ruby", total: 70, tier_map: { S: 7, A: 22, B: 25, C: 16 } },
                      { language: "Dart", total: 60, tier_map: { S: 6, A: 20, B: 22, C: 12 } },
                      { language: "Kotlin", total: 50, tier_map: { S: 5, A: 16, B: 18, C: 11 } },
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

                      // Calculate weighted welcoming score out of 100
                      const weightedScore = sPct * 1.0 + aPct * 0.75 + bPct * 0.4 + cPct * 0.1;

                      return {
                        ...item,
                        sCount,
                        aCount,
                        bCount,
                        cCount,
                        grandTotal,
                        sPct,
                        aPct,
                        bPct,
                        cPct,
                        weightedScore,
                      };
                    })
                    .sort((a, b) => b.weightedScore - a.weightedScore)
                    .slice(0, 10)
                    .map((item, idx) => {
                      const rankMedal =
                        idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;

                      return (
                        <div
                          key={item.language}
                          className="text-xs group p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-white hover:shadow-xs transition-all"
                        >
                          <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1.5 text-zinc-700 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-zinc-400 min-w-[24px]">
                                {rankMedal}
                              </span>
                              <Link
                                href={`/rankings/${item.language.toLowerCase()}`}
                                className="font-bold text-zinc-900 hover:text-emerald-600 transition-colors flex items-center gap-1.5"
                              >
                                <LangLogo language={item.language} />
                                {item.language}
                              </Link>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px]">
                                <span className="text-emerald-600 font-bold">{item.sPct.toFixed(0)}% S</span>
                                <span className="text-blue-600">{item.aPct.toFixed(0)}% A</span>
                                <span className="text-amber-600">{item.bPct.toFixed(0)}% B</span>
                                <span className="text-purple-600">{item.cPct.toFixed(0)}% C</span>
                                <span className="text-zinc-400 font-sans">({item.grandTotal} repos)</span>
                              </div>
                              <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                {item.weightedScore.toFixed(1)} pts
                              </span>
                            </div>
                          </div>

                          {/* Segmented Bar with Tooltip */}
                          <div className="h-3.5 w-full rounded-md bg-zinc-100 overflow-hidden flex shadow-xs border border-zinc-200/50">
                            {item.sPct > 0 && (
                              <div
                                title={`Super Welcoming: ${item.sCount} repos (${item.sPct.toFixed(1)}%)`}
                                className="h-full bg-emerald-500 hover:brightness-125 transition-all cursor-pointer relative"
                                style={{ width: `${item.sPct}%` }}
                              />
                            )}
                            {item.aPct > 0 && (
                              <div
                                title={`Welcoming: ${item.aCount} repos (${item.aPct.toFixed(1)}%)`}
                                className="h-full bg-blue-500 hover:brightness-125 transition-all cursor-pointer relative"
                                style={{ width: `${item.aPct}%` }}
                              />
                            )}
                            {item.bPct > 0 && (
                              <div
                                title={`Moderate: ${item.bCount} repos (${item.bPct.toFixed(1)}%)`}
                                className="h-full bg-amber-500 hover:brightness-125 transition-all cursor-pointer relative"
                                style={{ width: `${item.bPct}%` }}
                              />
                            )}
                            {item.cPct > 0 && (
                              <div
                                title={`Slow Review: ${item.cCount} repos (${item.cPct.toFixed(1)}%)`}
                                className="h-full bg-purple-500 hover:brightness-125 transition-all cursor-pointer relative"
                                style={{ width: `${item.cPct}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-sans">
                <span>Top 10 ecosystems ranked dynamically by contributor merge & response velocity.</span>
              </div>
            </div>

            {/* 2. Global Rating Composition Donut Visualization & Tier Cards */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      Global Contributor Vibe Composition
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                      Platform-wide ratio of open-source repository responsiveness tiers.
                    </p>
                  </div>
                  <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded-full text-zinc-600 shrink-0 w-max">1,200 Repos</span>
                </div>

                {/* SVG Donut Ring with Synchronized Colors */}
                <div className="my-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
                  <div className="relative flex items-center justify-center shrink-0">
                    <svg className="h-32 w-32 sm:h-36 sm:w-36 -rotate-90 transform" viewBox="0 0 36 36">
                      <path
                        className="text-zinc-100"
                        strokeWidth="3.8"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* Super Welcoming (Emerald) */}
                      <path
                        className="text-emerald-500 transition-all duration-1000"
                        strokeDasharray="18, 100"
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* Welcoming (Blue) */}
                      <path
                        className="text-blue-500 transition-all duration-1000"
                        strokeDasharray="32, 100"
                        strokeDashoffset="-18"
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* Moderate (Amber) */}
                      <path
                        className="text-amber-500 transition-all duration-1000"
                        strokeDasharray="35, 100"
                        strokeDashoffset="-50"
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <div className="text-lg sm:text-xl font-bold font-mono text-zinc-900">
                        {stats?.s_class_count !== undefined ? stats.s_class_count : 65}
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-mono text-emerald-600 font-semibold uppercase">Super Welcoming</div>
                    </div>
                  </div>

                  {/* Tier Cards Grid with Human-Friendly Lingo */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs w-full max-w-xs">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2 sm:p-2.5">
                      <div className="text-[9px] sm:text-[10px] text-emerald-800 font-bold uppercase truncate">Super Welcoming</div>
                      <div className="text-base sm:text-lg font-bold text-emerald-950 mt-0.5">
                        {stats?.s_class_count !== undefined ? stats.s_class_count : stats?.rank_counts?.["S"] || 65}
                      </div>
                      <div className="text-[9px] text-emerald-700 font-sans">Score 70–100</div>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-2 sm:p-2.5">
                      <div className="text-[9px] sm:text-[10px] text-blue-800 font-bold uppercase truncate">Welcoming</div>
                      <div className="text-base sm:text-lg font-bold text-blue-950 mt-0.5">
                        {stats?.rank_counts?.["A"] || 185}
                      </div>
                      <div className="text-[9px] text-blue-700 font-sans">Score 55–69</div>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2 sm:p-2.5">
                      <div className="text-[9px] sm:text-[10px] text-amber-800 font-bold uppercase truncate">Moderate</div>
                      <div className="text-base sm:text-lg font-bold text-amber-950 mt-0.5">
                        {stats?.rank_counts?.["B"] || 354}
                      </div>
                      <div className="text-[9px] text-amber-700 font-sans">Score 40–54</div>
                    </div>

                    <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-2 sm:p-2.5">
                      <div className="text-[9px] sm:text-[10px] text-purple-800 font-bold uppercase truncate">Slow Review</div>
                      <div className="text-base sm:text-lg font-bold text-purple-950 mt-0.5">
                        {stats?.rank_counts?.["C"] || 246}
                      </div>
                      <div className="text-[9px] text-purple-700 font-sans">Score 25–39</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-sans">
                <span>Unmaintained repositories (score &lt; 25) are automatically filtered out.</span>
              </div>
            </div>
          </div>

          {/* 3 Pillar Feature Cards */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mb-16 font-mono">
            {/* Card 1 */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs hover:border-zinc-300 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white mb-4">
                <Zap className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-2">Objective C-Rank™ Telemetry</h3>
              <p className="text-xs text-zinc-600 font-sans leading-relaxed">
                We calculate S to D tiers by analyzing average review response times, external PR acceptance rates, and repeat contributor retention using the GitHub GraphQL API.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs hover:border-zinc-300 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white mb-4">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-2">First-Timer Vibe Check</h3>
              <p className="text-xs text-zinc-600 font-sans leading-relaxed">
                Filter by languages like Go, Rust, and TypeScript to find open doors that actively welcome first-time contributors with friendly maintainers.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs hover:border-zinc-300 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white mb-4">
                <Bell className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-2">Watch & Watchlist Repos</h3>
              <p className="text-xs text-zinc-600 font-sans leading-relaxed">
                Subscribe to your favorite repositories to receive real-time notifications when maintainer review responsiveness shifts or new issue triage speeds improve.
              </p>
            </div>
          </div>

          {/* Informational Callout & GitHub Sign In Banner */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Track Maintainer Responsiveness</span>
              </div>
              <h3 className="text-2xl font-bold font-mono tracking-tight">Ready to find your next open-source contribution?</h3>
              <p className="mt-2 text-xs text-zinc-400 font-sans leading-relaxed">
                Sign in with your GitHub account to watch repositories, unlock AI Maintainer Vibe Check guidelines, and receive automated PR review alerts.
              </p>
            </div>
            <a
              href={`${API_BASE_URL}/api/v1/auth/github`}
              onClick={() => posthog.capture('github_sign_in_clicked', { source: 'homepage_cta_banner' })}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-mono text-xs font-bold text-zinc-900 hover:bg-zinc-100 active:scale-95 transition-all shadow-md shrink-0"
            >
              <span>Sign in with GitHub</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Silicon Valley Minimal Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 text-center text-xs font-mono text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} opendoor — Glassdoor for Open Source Repositories</div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/abhisheksoni27/opendoor" target="_blank" rel="noreferrer" className="hover:text-zinc-900">
              GitHub
            </a>
            <a href="/api/v1/health" className="hover:text-zinc-900">
              API Status
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
