"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { RepoCard } from "@/components/RepoCard";
import { RelativityCanvas } from "@/components/RelativityCanvas";
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

export default function Home() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [stats, setStats] = useState<MacroStats | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>("All");
  const [selectedBucket, setSelectedBucket] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [trendingOnly, setTrendingOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalReposCount, setTotalReposCount] = useState<number>(0);
  const perPage = 9; // 3 rows of 3 columns (3x3 grid)

  const languages = ["All", "Go", "TypeScript", "Python", "Rust", "C++", "Java", "PHP", "Ruby", "Dart", "Kotlin"];
  const buckets = ["All", "500-1k", "1k-5k", "5k-20k", "20k-50k", "50k+"];

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
  }, [selectedLang, selectedBucket, searchQuery, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRepos();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchRepos]);

  useEffect(() => {
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
    setPage(1); // Reset to page 1 on filter change
  };

  const handleBucketChange = (bucket: string) => {
    setLoading(true);
    setSelectedBucket(bucket);
    setPage(1); // Reset to page 1 on filter change
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    setSearchQuery(e.target.value);
    setPage(1); // Reset to page 1 on search
  };

  const handlePageChange = (newPage: number) => {
    setLoading(true);
    setPage(newPage);
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-white overflow-hidden">
      <RelativityCanvas />
      <Header />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-4 pt-16 pb-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl font-mono">
          Don&apos;t guess which door is open<span className="text-emerald-600">.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg leading-relaxed">
          Opendoor shows you public GitHub repositories where your pull requests are actually welcomed, reviewed fast, and merged.
        </p>

        {/* Macro Metrics Bar */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl mx-auto rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-xs">
          <div>
            <div className="text-2xl font-bold font-mono text-zinc-900">
              {stats?.total_repos ? stats.total_repos.toLocaleString() : totalReposCount > 0 ? totalReposCount.toLocaleString() : "1,189"}
            </div>
            <div className="text-xs text-zinc-500 font-mono">Repos Scored</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {stats?.s_class_count !== undefined ? stats.s_class_count : stats?.rank_counts?.["S"] !== undefined ? stats.rank_counts["S"] : "420"}
            </div>
            <div className="text-xs text-zinc-500 font-mono">S-Class Open Doors</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-zinc-900">
              {stats?.languages_count ? `${stats.languages_count}+` : "10+"}
            </div>
            <div className="text-xs text-zinc-500 font-mono">Languages Covered</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-zinc-900">
              {stats?.avg_response_hours ? `${stats.avg_response_hours.toFixed(1)}h` : "4.2h"}
            </div>
            <div className="text-xs text-zinc-500 font-mono">Avg First Review</div>
          </div>
        </div>
      </section>

      {/* Main Filter & Leaderboard Grid */}
      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 flex-1 w-full">
        {/* Controls Bar */}
        <div className="sticky top-20 z-40 mb-8 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search repo by name, owner, or technology..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 pl-9 pr-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono transition-all"
              />
            </div>

            {/* Trending Toggle */}
            <button
              onClick={() => setTrendingOnly(!trendingOnly)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                trendingOnly
                  ? "border-orange-300 bg-orange-50 text-orange-700 shadow-xs"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <Flame className={`h-3.5 w-3.5 ${trendingOnly ? "fill-orange-500 text-orange-500" : ""}`} />
              Daily Trending Repos
            </button>
          </div>

          {/* Language & Bucket Filter Pills */}
          <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between text-xs">
            {/* Language Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1">
                <Code2 className="h-3 w-3" /> Lang:
              </span>
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLangChange(lang)}
                  className={`rounded-md px-2.5 py-1 font-mono active:scale-95 transition-all ${
                    selectedLang === lang
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Bucket Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Stars:
              </span>
              {buckets.map((b) => (
                <button
                  key={b}
                  onClick={() => handleBucketChange(b)}
                  className={`rounded-md px-2.5 py-1 font-mono active:scale-95 transition-all ${
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
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-zinc-200 pt-6 font-mono text-xs text-zinc-600">
              <div>
                Showing page <span className="font-bold text-zinc-900">{page}</span> of{" "}
                <span className="font-bold text-zinc-900">{totalPages || 1}</span> ({totalReposCount.toLocaleString()} total)
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => handlePageChange(Math.max(page - 1, 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1 px-2">
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
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
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
      <section className="border-t border-zinc-200 bg-zinc-50/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-mono text-emerald-700 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Glassdoor for Open Source Repositories</span>
            </div>
            <h2 className="text-3xl font-bold font-mono text-zinc-900 sm:text-4xl">
              Stop submitting PRs to ghost towns<span className="text-emerald-600">.</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed font-sans">
              Thousands of open-source contributors waste hours writing clean pull requests only to have them sit unreviewed for months. 
              <strong> Opendoor C-Rank™</strong> uses objective mathematical telemetry to grade repository maintainer responsiveness, merge velocity, and first-time contributor success.
            </p>
          </div>

          {/* Rich Macro Visualizations: Stacked Language-Tier Chart & Dynamic Tier Donut */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-16 font-mono">
            {/* 1. Stacked Language Tier Distribution Bar Chart */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-emerald-600" />
                      Language x C-Rank™ Tier Distribution
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                      Proportional breakdown of open-door repositories per language by rating tier.
                    </p>
                  </div>
                  <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded-full text-zinc-600 shrink-0">Live Matrix</span>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-[11px] mb-5">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> S Tier (Score 70+)
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 inline-block" /> A Tier (55–69)
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" /> B Tier (40–54)
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-500">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 inline-block" /> C Tier (25–39)
                  </span>
                </div>

                {/* Stacked Bars */}
                <div className="space-y-4">
                  {(
                    stats?.language_breakdown || [
                      { language: "Python", total: 245, tier_map: { S: 35, A: 85, B: 95, C: 30 } },
                      { language: "TypeScript", total: 210, tier_map: { S: 28, A: 72, B: 80, C: 30 } },
                      { language: "Go", total: 180, tier_map: { S: 25, A: 65, B: 60, C: 30 } },
                      { language: "Rust", total: 140, tier_map: { S: 18, A: 42, B: 50, C: 30 } },
                      { language: "C++", total: 95, tier_map: { S: 10, A: 30, B: 35, C: 20 } },
                    ]
                  )
                    .slice(0, 5)
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

                      return (
                        <div key={item.language} className="text-xs group">
                          <div className="flex justify-between items-center text-zinc-700 mb-1.5">
                            <span className="font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                              {item.language}
                              <span className="text-[10px] text-emerald-600 font-mono">
                                ({sCount} S-Class)
                              </span>
                            </span>
                            <span className="text-[11px] text-zinc-500 font-sans">{grandTotal} repos</span>
                          </div>
                          {/* Segmented Bar */}
                          <div className="h-3.5 w-full rounded-md bg-zinc-100 overflow-hidden flex shadow-xs border border-zinc-200/50">
                            {sPct > 0 && (
                              <div
                                title={`S Tier: ${sCount} repos (${sPct.toFixed(1)}%)`}
                                className="h-full bg-emerald-500 hover:brightness-110 transition-all"
                                style={{ width: `${sPct}%` }}
                              />
                            )}
                            {aPct > 0 && (
                              <div
                                title={`A Tier: ${aCount} repos (${aPct.toFixed(1)}%)`}
                                className="h-full bg-emerald-300 hover:brightness-110 transition-all"
                                style={{ width: `${aPct}%` }}
                              />
                            )}
                            {bPct > 0 && (
                              <div
                                title={`B Tier: ${bCount} repos (${bPct.toFixed(1)}%)`}
                                className="h-full bg-amber-400 hover:brightness-110 transition-all"
                                style={{ width: `${bPct}%` }}
                              />
                            )}
                            {cPct > 0 && (
                              <div
                                title={`C Tier: ${cCount} repos (${cPct.toFixed(1)}%)`}
                                className="h-full bg-zinc-300 hover:brightness-110 transition-all"
                                style={{ width: `${cPct}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-sans">
                <span>Hover stacked segments to inspect exact repo counts per tier.</span>
              </div>
            </div>

            {/* 2. Global C-Rank Donut Visualization & Tier Cards */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Global Rating Tier Composition
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                      Platform-wide ratio of S, A, B, and C Class Open Doors.
                    </p>
                  </div>
                  <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded-full text-zinc-600 shrink-0">1,200 Repos</span>
                </div>

                {/* SVG Donut Ring */}
                <div className="my-6 flex flex-col sm:flex-row items-center justify-center gap-8">
                  <div className="relative flex items-center justify-center">
                    <svg className="h-36 w-36 -rotate-90 transform" viewBox="0 0 36 36">
                      {/* Background Track */}
                      <path
                        className="text-zinc-100"
                        strokeWidth="3.8"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* S Tier Stroke */}
                      <path
                        className="text-emerald-500 transition-all duration-1000"
                        strokeDasharray="18, 100"
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* A Tier Stroke */}
                      <path
                        className="text-emerald-300 transition-all duration-1000"
                        strokeDasharray="32, 100"
                        strokeDashoffset="-18"
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* B Tier Stroke */}
                      <path
                        className="text-amber-400 transition-all duration-1000"
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
                      <div className="text-xl font-bold font-mono text-zinc-900">
                        {stats?.s_class_count !== undefined ? stats.s_class_count : 65}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-600 font-semibold uppercase">S-Class</div>
                    </div>
                  </div>

                  {/* Tier Cards Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs w-full max-w-xs">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                      <div className="text-[10px] text-emerald-800 font-bold">S CLASS DOOR</div>
                      <div className="text-lg font-bold text-emerald-950 mt-0.5">
                        {stats?.s_class_count !== undefined ? stats.s_class_count : stats?.rank_counts?.["S"] || 65}
                      </div>
                      <div className="text-[9px] text-emerald-700 font-sans">Score 70–100</div>
                    </div>

                    <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/20 p-2.5">
                      <div className="text-[10px] text-emerald-600 font-bold">A CLASS DOOR</div>
                      <div className="text-lg font-bold text-zinc-900 mt-0.5">
                        {stats?.rank_counts?.["A"] || 185}
                      </div>
                      <div className="text-[9px] text-zinc-500 font-sans">Score 55–69</div>
                    </div>

                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-2.5">
                      <div className="text-[10px] text-amber-700 font-bold">B CLASS DOOR</div>
                      <div className="text-lg font-bold text-zinc-900 mt-0.5">
                        {stats?.rank_counts?.["B"] || 354}
                      </div>
                      <div className="text-[9px] text-zinc-500 font-sans">Score 40–54</div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
                      <div className="text-[10px] text-zinc-500 font-bold">C CLASS DOOR</div>
                      <div className="text-lg font-bold text-zinc-900 mt-0.5">
                        {stats?.rank_counts?.["C"] || 246}
                      </div>
                      <div className="text-[9px] text-zinc-500 font-sans">Score 25–39</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-sans">
                <span>D-Class (score &lt; 25 or unmaintained) are automatically filtered out.</span>
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
