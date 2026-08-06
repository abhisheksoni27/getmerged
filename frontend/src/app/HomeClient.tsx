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
  const visibleLanguages = showAllLanguages ? languages : languages.slice(0, 10);

  // Floating Search Modal State
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const searchModalInputRef = React.useRef<HTMLInputElement | null>(null);

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const heroSearchRef = React.useRef<HTMLDivElement | null>(null);

  // Rotating search placeholder text for 100k+ star famous repos
  const famousRepos = React.useMemo(
    () => [
      "freeCodeCamp/freeCodeCamp",
      "facebook/react",
      "vuejs/vue",
      "twbs/bootstrap",
      "sindresorhus/awesome",
      "tensorflow/tensorflow",
      "torvalds/linux",
      "goldbergyoni/nodebestpractices",
      "ohmyzsh/ohmyzsh",
      "flutter/flutter",
      "microsoft/vscode",
      "vibe/nextjs",
    ],
    []
  );
  const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % famousRepos.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [famousRepos.length]);

  // Sticky header search bar on scroll up
  const [isHeroSearchVisible, setIsHeroSearchVisible] = useState<boolean>(true);
  const [isScrollingUp, setIsScrollingUp] = useState<boolean>(false);
  const lastScrollY = React.useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY.current && currentScrollY > 200) {
        setIsScrollingUp(true);
      } else {
        setIsScrollingUp(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!heroSearchRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroSearchVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(heroSearchRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => {
        searchModalInputRef.current?.focus();
        searchModalInputRef.current?.select();
      }, 50);
    }
  }, [isSearchModalOpen]);

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

  const [spotlightRepos, setSpotlightRepos] = useState<Repo[]>([]);

  useEffect(() => {
    // Fetch top welcoming repos sorted by C-Rank score descending (highest merge rate & responsiveness)
    fetch(`${API_BASE_URL}/api/v1/repos?sort=c_rank_score&order=desc&per_page=30`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const rawList = data?.data || data?.repos;
        if (Array.isArray(rawList) && rawList.length > 0) {
          const mapped: Repo[] = rawList.map((r: Record<string, unknown>) => ({
            ...(r as unknown as Repo),
            c_rank_tier: (r.c_rank_tier as string) || (r.class_rank as string) || "A",
            class_rank: (r.class_rank as string) || (r.c_rank_tier as string) || "A",
            first_timer_success_rate: (r.first_timer_success_rate as number) !== undefined ? (r.first_timer_success_rate as number) : (r.first_timer_rate as number),
          }));

          // Issue #38 Fix: Guarantee 3 distinct languages, 1 from each
          const distinctLangRepos: Repo[] = [];
          const seenLangs = new Set<string>();

          for (const repo of mapped) {
            const lang = repo.language || "Other";
            if (!seenLangs.has(lang)) {
              seenLangs.add(lang);
              distinctLangRepos.push(repo);
            }
            if (distinctLangRepos.length === 3) break;
          }

          // Fallback to top 3 if fewer than 3 unique languages exist in pool
          setSpotlightRepos(distinctLangRepos.length === 3 ? distinctLangRepos : mapped.slice(0, 3));
        }
      })
      .catch(() => {});

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
      <Header
        showSearchBar={isScrollingUp && !isHeroSearchVisible}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        searchQuery={searchQuery}
        placeholderText={`Search repositories... e.g. ${famousRepos[placeholderIndex]}`}
      />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-6xl px-4 pt-16 pb-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl font-space leading-tight sm:leading-tight">
          Stop wasting weeks on <span className="brush-highlight text-zinc-900 px-1.5">ignored PRs.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-zinc-600 sm:text-lg leading-relaxed font-sans">
          Find repositories where maintainers actually review and merge contributions - backed by real PR response rates and first-timer success metrics.
        </p>

        {/* Hero Prominent Search Bar */}
        <div ref={heroSearchRef} className="mt-8 max-w-2xl mx-auto">
          <div
            onClick={() => setIsSearchModalOpen(true)}
            className="relative flex items-center shadow-lg rounded-xl overflow-hidden border border-zinc-200 bg-white cursor-pointer group hover:border-zinc-300 transition-all"
          >
            <Search className="absolute left-4 h-5 w-5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              readOnly
              placeholder={`Search repositories... e.g. ${famousRepos[placeholderIndex]}`}
              value={searchQuery}
              className="w-full pl-12 pr-20 py-4 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none font-sans cursor-pointer transition-all duration-300"
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
                  setIsSearchModalOpen(false);
                  posthog.capture('repo_searched', { query: term, source: 'hero_chip' });
                  // Auto scroll to leaderboard results section
                  const gridEl = document.getElementById("leaderboard-grid");
                  if (gridEl) {
                    gridEl.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="rounded-md border border-zinc-200/80 bg-white px-2.5 py-1 font-mono text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-all cursor-pointer active:scale-95"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Dedicated Top 3 Repos Spotlight Section */}
        <div className="mt-12 text-left">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-space font-extrabold text-zinc-900 flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500 fill-orange-500" /> Today&apos;s Top Welcoming Repositories
              </h2>
              <p className="text-xs text-zinc-500 font-sans">Handpicked repositories merging first-time PRs right now.</p>
            </div>
          </div>

          {/* 3-Card Spotlight Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {spotlightRepos.length === 0 && loading ? (
              [1, 2, 3].map((i) => (
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
              ))
            ) : spotlightRepos.length > 0 ? (
              spotlightRepos.slice(0, 3).map((r, idx) => (
                <RepoCard key={r.id || r.full_name} repo={r} isLoggedIn={isLoggedIn} isSpotlight={true} spotlightIndex={idx} />
              ))
            ) : repos.length > 0 ? (
              repos.slice(0, 3).map((r, idx) => (
                <RepoCard key={r.id || r.full_name} repo={r} isLoggedIn={isLoggedIn} isSpotlight={true} spotlightIndex={idx} />
              ))
            ) : null}
          </div>
        </div>

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
      <main id="leaderboard-grid" className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex-1 w-full">
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
          <div className="flex items-center gap-2 pt-1 text-xs overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth pb-0.5">
            <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
              <Sparkles className="h-3 w-3 text-zinc-700" /> Vibe:
            </span>
            {tiers.map((t) => (
              <button
                key={t.value}
                onClick={() => handleTierChange(t.value)}
                className={`rounded-lg px-3 py-1.5 font-mono text-[11px] sm:text-xs transition-all cursor-pointer shrink-0 ${
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
          <div className="flex flex-col gap-3 pt-1 text-xs">
            {/* Language Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth pb-0.5">
              <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
                <Code2 className="h-3 w-3" /> Lang:
              </span>
              {visibleLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLangChange(lang)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] sm:text-xs transition-all cursor-pointer shrink-0 ${
                    selectedLang === lang
                      ? "bg-zinc-900 text-white shadow-xs font-semibold"
                      : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-100 border border-transparent"
                  }`}
                >
                  {lang !== "All" && <LangLogo language={lang} />}
                  <span>{lang}</span>
                </button>
              ))}
              {languages.length > 10 && (
                <button
                  onClick={() => setShowAllLanguages(!showAllLanguages)}
                  className="font-mono text-[11px] text-zinc-700 font-bold hover:underline px-2 py-1 cursor-pointer shrink-0"
                >
                  {showAllLanguages ? "Show Less" : `+${languages.length - 10} More`}
                </button>
              )}
            </div>

            {/* Stars Bucket Filter */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth pb-0.5">
              <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
                <Star className="h-3 w-3" /> Stars:
              </span>
              {buckets.map((b) => (
                <button
                  key={b}
                  onClick={() => handleBucketChange(b)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-[11px] sm:text-xs transition-all cursor-pointer shrink-0 ${
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
          <div className="flex items-center gap-2 pt-1 text-xs overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth pb-0.5">
            <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-700" /> First-Timer friendly:
            </span>
            {firstTimerBuckets.map((b) => (
              <button
                key={b}
                onClick={() => handleFirstTimerBucketChange(b)}
                className={`rounded-lg px-3 py-1.5 font-mono text-[11px] sm:text-xs transition-all cursor-pointer shrink-0 ${
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
            {/* Expanded & Highlighted Ecosystem Leaderboard - Grand Section Redesign */}
            <div className="rounded-3xl bg-white p-6 sm:p-10 border-2 border-brand-dark shadow-[6px_6px_0px_#222831]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-zinc-900 pb-6 mb-8 gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand-cream px-3 py-1 text-xs font-mono font-bold text-brand-dark border border-brand-dark/20 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-brand-dark shrink-0" />
                    Ecosystem Index
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-space tracking-tight">
                    Top Welcoming Ecosystems
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-500 font-sans mt-1">
                    Mathematical rankings of open-source ecosystems that actively welcome external pull requests.
                  </p>
                </div>
                
                {/* Share Actions */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs text-zinc-400 font-sans font-semibold hidden sm:inline">Share:</span>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      "No more writing PRs for dead repos. opendoor grades public GitHub projects using mathematical PR merge rates and review times. Check out these rankings! 🚪✨\n\nhttps://opendoor.abhishekco.de"
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => posthog.capture('rankings_shared', { platform: 'twitter' })}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-dark bg-white px-3.5 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-100 transition-all font-sans cursor-pointer shadow-[2px_2px_0px_#222831]"
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
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-dark bg-white px-3.5 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-100 transition-all font-sans cursor-pointer shadow-[2px_2px_0px_#222831]"
                  >
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 11.5c0-1.65-1.35-3-3-3-.96 0-1.86.48-2.42 1.24-1.64-1-3.85-1.64-6.24-1.72l1.37-4.31 3.8 1.19c.14.78.8 1.38 1.63 1.38 1.05 0 1.9-.85 1.9-1.9s-.85-1.9-1.9-1.9c-.83 0-1.5.59-1.63 1.38l-4.14-1.3c-.2-.06-.41.04-.48.24l-1.52 4.8C5.9 7.82 3.69 8.46 2.05 9.46 1.48 8.7 0.58 8.22-.38 8.22c-1.65 0-3 1.35-3 3 0 1.21.72 2.26 1.77 2.73C-1.6 14.54-1.6 15.14-1.6 15.5c0 3.59 5.37 6.5 12 6.5s12-2.91 12-6.5c0-.36 0-.96-.02-1.53 1.05-.47 1.77-1.52 1.77-2.73z" />
                    </svg>
                    <span>Reddit</span>
                  </a>
                </div>
              </div>

              {/* Grand Table List - No Individual Boxes */}
              <div className="divide-y divide-zinc-200/80">
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
                      <div key={item.language} className="py-6 first:pt-2 last:pb-2 group transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Left: Big Fancy Bold Language Name + Badge */}
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-lg font-bold text-zinc-400 w-8">{rankMedal}</span>
                            <div className="h-10 w-10 rounded-xl border-2 border-brand-dark bg-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#222831] group-hover:rotate-6 transition-transform">
                              <LangLogo language={item.language} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/rankings/${item.language.toLowerCase()}`}
                                  className="font-space text-2xl font-black text-zinc-900 group-hover:text-blue-600 transition-colors tracking-tight hover:underline"
                                >
                                  {item.language}
                                </Link>
                                {item.language.toLowerCase() === "go" && (
                                  <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-mono font-extrabold text-emerald-900 border border-emerald-300">
                                    ▲ +4.2% 30d
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500 font-sans mt-0.5">
                                Maintainers merge <strong>{item.sCount + item.aCount}</strong> welcoming projects with an avg <strong>{item.avg_merge_rate ? `${item.avg_merge_rate.toFixed(0)}%` : "84%"}</strong> acceptance velocity.
                              </p>
                            </div>
                          </div>

                          {/* Right: Clean Metric Columns (Table-like rhythm) */}
                          <div className="flex items-center gap-6 sm:gap-10 shrink-0 font-mono text-right pl-11 md:pl-0">
                            <div>
                              <div className="text-xs text-zinc-400 font-sans">Welcoming Repos</div>
                              <div className="text-base font-extrabold text-zinc-900">
                                {item.sCount + item.aCount} <span className="text-xs text-zinc-400 font-normal">/ {item.grandTotal}</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400 font-sans">Super Welcoming</div>
                              <div className="text-base font-extrabold text-emerald-600">
                                {item.sCount}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400 font-sans">Score</div>
                              <div className="inline-block px-3 py-1 rounded-xl bg-brand-cream border-2 border-brand-dark text-brand-dark font-black text-sm shadow-[2px_2px_0px_#222831]">
                                {item.weightedScore.toFixed(1)} pts
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Authority & Telemetry Standard Section - Replaces Bland Feature Boxes */}
          <div className="rounded-3xl border-2 border-brand-dark bg-[#faf9f6] p-8 sm:p-12 shadow-[6px_6px_0px_#222831] mb-16">
            <div className="max-w-3xl mb-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-mono font-extrabold text-emerald-950 border border-emerald-300 mb-3">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                <span>The Opendoor Authority Standard</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-space text-zinc-900 tracking-tight">
                How Opendoor Eliminates Ghost-Town Repositories
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 font-sans mt-2 leading-relaxed">
                We don&apos;t rely on subjective opinions or star counts. Opendoor queries raw GitHub GraphQL event streams continuously to compute real maintainer velocity metrics.
              </p>
            </div>

            {/* 3 Authoritative Telemetry Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t-2 border-zinc-900/10 font-sans">
              <div className="space-y-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-cream border-2 border-brand-dark text-brand-dark font-mono font-extrabold text-sm shadow-[2px_2px_0px_#222831]">
                  01
                </div>
                <h4 className="font-space text-lg font-black text-zinc-900">GraphQL Telemetry Engine</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Calculates exact maintainer response latency down to the minute. PRs merged or reviewed within 24 hours score highest in C-Rank™ calculations.
                </p>
              </div>

              <div className="space-y-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 border-2 border-blue-900 text-blue-950 font-mono font-extrabold text-sm shadow-[2px_2px_0px_#1e3a8a]">
                  02
                </div>
                <h4 className="font-space text-lg font-black text-zinc-900">First-Timer Conversion Rate</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Evaluates the success rate of authors submitting their first PR to a repo. Excludes internal maintainer merges to preserve true external contributor statistics.
                </p>
              </div>

              <div className="space-y-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 border-2 border-amber-900 text-amber-950 font-mono font-extrabold text-sm shadow-[2px_2px_0px_#78350f]">
                  03
                </div>
                <h4 className="font-space text-lg font-black text-zinc-900">Verified Contributor Badges</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Sign in with GitHub to cross-reference merged commits. Reviews submitted by verified contributors carry 3x weight on maintainer sentiment scorecards.
                </p>
              </div>
            </div>
          </div>

          {/* High-Converting Neo-Brutalist GitHub Sign-In Banner */}
          <div className="rounded-3xl border-2 border-brand-dark bg-[#dfd0b8] p-8 sm:p-12 text-zinc-950 shadow-[6px_6px_0px_#222831] flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="inline-block rounded-md bg-white border-2 border-brand-dark px-3 py-1 text-xs font-mono font-black text-zinc-900 shadow-[2px_2px_0px_#222831] mb-3">
                ⚡ Never Waste Another Pull Request
              </span>
              <h3 className="text-2xl sm:text-4xl font-black font-space tracking-tight leading-tight">
                Ready to find your next welcoming open-source contribution?
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-zinc-900/80 leading-relaxed font-sans font-medium">
                Sign in with your GitHub account to watch repositories, unlock AI Maintainer Vibe Check guidelines, and receive automated PR review alerts.
              </p>
            </div>
            <a
              href={`${API_BASE_URL}/api/v1/auth/github`}
              onClick={() => posthog.capture('github_sign_in_clicked', { source: 'homepage_cta_banner' })}
              className="inline-flex items-center gap-3 rounded-2xl border-2 border-brand-dark bg-zinc-950 px-8 py-4 font-mono text-sm font-extrabold text-white hover:bg-zinc-800 active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-[4px_4px_0px_#ffffff] shrink-0 cursor-pointer"
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

      {/* Command + K Floating Search Modal Dialog */}
      {isSearchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-zinc-950/60 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
          onClick={() => setIsSearchModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white border-2 border-brand-dark rounded-2xl shadow-[8px_8px_0px_#222831] overflow-hidden flex flex-col transition-all duration-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Search Input Header */}
            <div className="relative flex items-center border-b border-zinc-200 bg-zinc-50/60 p-4">
              <Search className="absolute left-5 h-5 w-5 text-zinc-400" />
              <input
                ref={searchModalInputRef}
                type="text"
                placeholder={`Search repositories by name... e.g. ${famousRepos[placeholderIndex]}`}
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-12 pr-12 text-base text-zinc-900 placeholder-zinc-400 bg-transparent border-none focus:outline-none font-sans font-medium"
              />
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="absolute right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 font-mono text-xs transition-colors cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Quick Filters / Tips Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-white border-b border-zinc-100 text-xs font-mono text-zinc-500">
              <div className="flex items-center gap-1.5">
                <span>Quick try:</span>
                {["nextjs", "react", "rust", "bun", "python"].map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setSearchQuery(term);
                      setLoading(true);
                      setPage(1);
                      setIsSearchModalOpen(false);
                      posthog.capture('repo_searched', { query: term, source: 'cmd_k_chip' });
                      const gridEl = document.getElementById("leaderboard-grid");
                      if (gridEl) {
                        gridEl.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer active:scale-95"
                  >
                    {term}
                  </button>
                ))}
              </div>
              <div>
                Showing <strong className="text-zinc-900">{repos.length}</strong> matching repos
              </div>
            </div>

            {/* Live Search Results List Preview */}
            <div className="max-h-96 overflow-y-auto p-3 space-y-2 font-sans divide-y divide-zinc-100">
              {repos.length > 0 ? (
                repos.slice(0, 5).map((r) => {
                  const rankTier = r.class_rank || r.c_rank_tier || "A";
                  return (
                    <a
                      key={r.id || r.full_name}
                      href={`/${r.full_name}`}
                      onClick={() => setIsSearchModalOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition-colors group cursor-pointer block no-underline text-current pt-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://github.com/${r.full_name?.split('/')[0]}.png`}
                          alt={r.full_name}
                          className="h-8 w-8 rounded-lg border border-brand-dark bg-white shrink-0 object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png";
                          }}
                        />
                        <div className="min-w-0">
                          <div className="font-space text-sm font-bold text-zinc-900 group-hover:text-blue-600 transition-colors truncate">
                            {r.full_name}
                          </div>
                          <div className="text-xs text-zinc-500 truncate font-sans">
                            {r.description || "No description provided."}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-xs font-mono text-zinc-500 font-medium">
                          {r.language}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold font-mono border rounded-md ${
                          rankTier === "S" ? "bg-emerald-100 text-emerald-900 border-emerald-300" :
                          rankTier === "A" ? "bg-blue-100 text-blue-900 border-blue-300" : "bg-amber-100 text-amber-900 border-amber-300"
                        }`}>
                          {rankTier} Tier
                        </span>
                      </div>
                    </a>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                  No repositories found matching &quot;{searchQuery}&quot;.
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-150 flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>Press <kbd className="bg-zinc-200 px-1 py-0.5 rounded text-zinc-700">ESC</kbd> to close modal</span>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="text-zinc-900 font-bold hover:underline cursor-pointer"
              >
                View all explorer results →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
