"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  ArrowRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "@/lib/api";
import { getLanguageSlug } from "@/lib/languageSlug";
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
  const perPage = 15;

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
  const searchModalInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const heroSearchRef = useRef<HTMLDivElement | null>(null);

  const famousRepos = useMemo(
    () => [
      "facebook/react",
      "vuejs/vue",
      "vercel/next.js",
      "golang/go",
      "rust-lang/rust",
      "oven-sh/bun",
      "tailwindlabs/tailwindcss",
      "astral-sh/uv",
      "shadcn/ui",
      "huggingface/transformers",
      "supabase/supabase",
      "django/django",
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

  // Sticky header search bar whenever hero search is out of view
  const [isHeroSearchVisible, setIsHeroSearchVisible] = useState<boolean>(true);

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
        let mappedList: Repo[] = rawList.map((r: Record<string, unknown>) => ({
          ...(r as unknown as Repo),
          c_rank_tier: (r.c_rank_tier as string) || (r.class_rank as string) || "A",
          class_rank: (r.class_rank as string) || (r.c_rank_tier as string) || "A",
          first_timer_success_rate: (r.first_timer_success_rate as number) !== undefined ? (r.first_timer_success_rate as number) : (r.first_timer_rate as number),
        }));

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
    const handleScroll = () => {
      sessionStorage.setItem("opendoor_scroll_pos", window.scrollY.toString());
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [spotlightRepos, setSpotlightRepos] = useState<Repo[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/repos?scored_today=true&sort=c_rank_score&order=desc&per_page=30`)
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

          setSpotlightRepos(distinctLangRepos.length === 3 ? distinctLangRepos : mapped.slice(0, 3));
        }
      })
      .catch(() => {});

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
    setPage(1);
    posthog.capture("repo_filter_applied", { filter_type: "language", value: lang });
  };

  const handleBucketChange = (bucket: string) => {
    setLoading(true);
    setSelectedBucket(bucket);
    setPage(1);
    posthog.capture("repo_filter_applied", { filter_type: "star_bucket", value: bucket });
  };

  const handleTierChange = (tierVal: string) => {
    setLoading(true);
    setSelectedTier(tierVal);
    setPage(1);
    posthog.capture("repo_filter_applied", { filter_type: "tier", value: tierVal });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    const query = e.target.value;
    setSearchQuery(query);
    setPage(1);
    if (query.trim()) {
      posthog.capture("repo_searched", { query: query.trim() });
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
    setPage(1);
    posthog.capture("trending_toggled", { enabled: next });
  };

  const handleFirstTimerBucketChange = (bucket: string) => {
    setLoading(true);
    setSelectedFirstTimerBucket(bucket);
    setPage(1);
    posthog.capture("repo_filter_applied", { filter_type: "first_timer_bucket", value: bucket });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 1 && !isLoggedIn) {
      openAuthModal(
        "Unlock Full Leaderboard Pages",
        "Sign in with GitHub to browse page 2+ results across all scored repositories.",
        "pagination"
      );
      return;
    }
    setLoading(true);
    setPage(newPage);
    window.scrollTo({ top: 400, behavior: "smooth" });
    posthog.capture("pagination_changed", { page: newPage, total_pages: totalPages });
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6] dev-grid-pattern">
      <RelativityCanvas />
      <Header
        showSearchBar={!isHeroSearchVisible}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        searchQuery={searchQuery}
        placeholderText={`Search repositories, e.g. ${famousRepos[placeholderIndex]}`}
      />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-6xl px-4 pt-14 pb-10 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl font-space leading-tight">
          Stop wasting weeks on <span className="bg-gradient-to-r from-amber-200/90 via-orange-200/90 to-amber-200/90 text-zinc-950 px-3 py-0.5 rounded-xl border border-orange-300/60 shadow-xs inline-block transform -rotate-1">ignored PRs.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 sm:text-lg leading-relaxed font-sans">
          Find repositories where maintainers actually review and merge contributions, backed by real PR response rates and first-timer success metrics.
        </p>

        {/* Hero Search Bar */}
        <div ref={heroSearchRef} className="mt-8 max-w-2xl mx-auto">
          <div
            onClick={() => setIsSearchModalOpen(true)}
            className="relative flex items-center rounded-2xl border border-zinc-300 bg-white px-4 py-3.5 shadow-sm hover:border-zinc-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <Search className="h-5 w-5 text-zinc-400 group-hover:text-zinc-600 shrink-0 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              readOnly
              placeholder={`Search repositories, e.g. ${famousRepos[placeholderIndex]}`}
              value={searchQuery}
              className="w-full pl-3 pr-20 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none font-sans bg-transparent cursor-pointer"
            />
            <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
              {searchQuery ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                    setLoading(true);
                    setPage(1);
                  }}
                  className="pointer-events-auto text-xs font-mono text-zinc-500 hover:text-zinc-800 mr-1"
                >
                  Clear
                </button>
              ) : null}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-500">
                <span>⌘</span>K
              </kbd>
            </div>
          </div>

          {/* Quick Search Chips */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-mono text-zinc-400">Quick explore:</span>
            {["nextjs", "react", "rust", "bun", "fastapi"].map((term) => (
              <motion.button
                key={term}
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                onClick={() => {
                  setSearchQuery(term);
                  setLoading(true);
                  setPage(1);
                  setIsSearchModalOpen(false);
                  posthog.capture("repo_searched", { query: term, source: "hero_chip" });
                  const gridEl = document.getElementById("leaderboard-grid");
                  if (gridEl) {
                    gridEl.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-mono text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 shadow-2xs cursor-pointer transition-colors"
              >
                {term}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Macro Telemetry Grid */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-3xl mx-auto rounded-2xl bg-white p-4 sm:p-5 border border-zinc-200/80 shadow-xs items-center text-center">
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900">
              {stats?.avg_response_hours ? "82%" : <div className="h-6 w-12 bg-zinc-100 rounded animate-pulse mx-auto" />}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Avg Merge Rate</div>
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
                <div className="h-6 w-12 bg-zinc-100 rounded animate-pulse mx-auto" />
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Avg First Review</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900">
              {stats?.s_class_count !== undefined ? (
                stats.s_class_count.toLocaleString()
              ) : (
                <div className="h-6 w-12 bg-zinc-100 rounded animate-pulse mx-auto" />
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Welcoming Repos</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900">
              {stats?.total_repos ? (
                stats.total_repos.toLocaleString()
              ) : (
                <div className="h-6 w-12 bg-zinc-100 rounded animate-pulse mx-auto" />
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500 font-mono">Repos Scored</div>
          </div>
        </div>

        {/* Educational Storytelling & Problem-Solution Narrative Blocks */}
        <div className="my-16 space-y-16 text-left">
          {/* Narrative Block 1: Left Copy, Right Visual (The Star Paradox & Zombie PRs) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl bg-white p-8 sm:p-12 border border-zinc-200/80 shadow-xs">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                <Star className="h-3.5 w-3.5 text-amber-600 fill-amber-400" /> The GitHub Star Illusion
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold font-space text-zinc-900 tracking-tight leading-tight">
                Stars Measure Yesterday&apos;s Hype. C-Rank Measures Today&apos;s Open Doors.
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 font-sans leading-relaxed">
                Over <strong className="text-zinc-900">60% of open-source maintainers</strong> are unpaid and overwhelmed by backlogs. When contributors sort solely by GitHub stars, they walk straight into exhausted projects where pull requests become &ldquo;zombie PRs&rdquo; that sit unreviewed for months.
              </p>
              <p className="text-xs sm:text-sm text-zinc-500 font-sans leading-relaxed">
                Opendoor bypasses vanity stars by monitoring real maintainer review turnaround, first-timer acceptance rates, and external PR merge velocity.
              </p>
              <div className="pt-2">
                <Link
                  href="/how-c-rank-works"
                  className="inline-flex items-center gap-2 text-xs font-mono font-bold text-zinc-900 hover:text-zinc-700 underline underline-offset-4"
                >
                  <span>Read the science of open source hospitality</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 bg-zinc-50 border border-zinc-200/80 rounded-2xl p-6 space-y-4 font-mono text-xs shadow-2xs">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <span className="text-zinc-400">Live Telemetry Contrast</span>
                <span className="text-emerald-700 font-bold">Real-time</span>
              </div>
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-white border border-rose-200/70">
                  <div className="flex justify-between text-zinc-800 font-bold mb-1">
                    <span>Famous Ghost Town</span>
                    <span className="text-rose-600 font-semibold">45k ★</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-sans leading-relaxed">
                    Median PR review wait: <strong className="text-rose-700">140+ days</strong> (C-Rank: Unmaintained)
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-emerald-200">
                  <div className="flex justify-between text-zinc-800 font-bold mb-1">
                    <span>Welcoming Open Door</span>
                    <span className="text-emerald-700 font-semibold">1.8k ★</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-sans leading-relaxed">
                    Median PR review wait: <strong className="text-emerald-800">&lt;6 hours</strong> (C-Rank: Super Welcoming)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Top Welcoming Repositories (Interspersed Live Demonstration) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-space font-bold text-zinc-900 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500 fill-orange-500" /> Today&apos;s Open Doors (High Review Velocity)
                </h2>
                <p className="text-xs text-zinc-500 font-sans mt-0.5">Verified active maintainers actively merging community contributions right now.</p>
              </div>
              <Link
                href="/hall-of-fame"
                className="text-xs font-mono font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 shrink-0"
              >
                View S-Tier Hall of Fame <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {spotlightRepos.length === 0 && loading ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 h-[260px] flex flex-col justify-between"
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
                      <div className="h-4 w-20 rounded bg-zinc-200" />
                      <div className="h-4 w-16 rounded bg-zinc-200" />
                    </div>
                  </div>
                ))
              ) : spotlightRepos.length > 0 ? (
                spotlightRepos.slice(0, 3).map((r, idx) => (
                  <RepoCard key={r.id || r.full_name} repo={r} isLoggedIn={isLoggedIn} isSpotlight={true} spotlightIndex={idx} />
                ))
              ) : null}
            </div>
          </div>

          {/* Narrative Block 2: Left Visual (9-Factor Radar), Right Copy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl bg-white p-8 sm:p-12 border border-zinc-200/80 shadow-xs">
            <div className="lg:col-span-5 bg-zinc-900 text-white rounded-2xl p-6 space-y-3 font-mono text-xs shadow-md">
              <div className="flex justify-between items-center text-zinc-400 border-b border-zinc-800 pb-2">
                <span>C-Rank™ Multi-Factor Telemetry</span>
                <span className="text-emerald-400 font-bold">Continuous Index</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-300">External Merge Rate</span>
                  <span className="text-emerald-400 font-bold">Primary</span>
                </div>
                <div className="flex justify-between items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-300">Review Turnaround Latency</span>
                  <span className="text-blue-400 font-bold">Core Factor</span>
                </div>
                <div className="flex justify-between items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-300">Commit Pulse & Recency</span>
                  <span className="text-purple-400 font-bold">Core Factor</span>
                </div>
                <div className="flex justify-between items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-300">First-Timer PR Conversion</span>
                  <span className="text-amber-400 font-bold">Hospitality</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Objective Mathematics
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold font-space text-zinc-900 tracking-tight leading-tight">
                9 Telemetry Factors. Zero Subjective Gossip.
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 font-sans leading-relaxed">
                Opendoor benchmarks repositories against peer codebases across 20+ language ecosystems. We measure reviewer turnaround velocity, repeat contributor retention, pull request friction, and maintainer core bus-factors.
              </p>
              <div className="pt-2">
                <Link
                  href="/how-c-rank-works"
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 font-sans text-xs font-semibold text-white hover:bg-zinc-800 transition-all shadow-xs"
                >
                  <span>Explore the scoring methodology</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Filter & Leaderboard Grid */}
      <main id="leaderboard-grid" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex-1 w-full pt-4">
        {/* Controls Bar */}
        <div className="sticky top-16 z-40 mb-8 rounded-2xl bg-white/95 p-4 sm:p-5 border border-zinc-200/80 shadow-sm backdrop-blur-md space-y-3.5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter repositories by name, owner, or stack..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-10 pr-14 py-2 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none font-sans transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-400">
                  <span>⌘</span>K
                </kbd>
              </div>
            </div>

            {/* Trending Toggle */}
            <button
              onClick={handleTrendingToggle}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                trendingOnly
                  ? "border-orange-300 bg-orange-50 text-orange-900 shadow-xs"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <Flame className={`h-3.5 w-3.5 ${trendingOnly ? "fill-orange-500 text-orange-500" : "text-zinc-500"}`} />
              Daily Trending Repos
            </button>
          </div>

          {/* C-Rank Tier Selector */}
          <div className="flex items-center gap-2 text-xs overflow-x-auto no-scrollbar whitespace-nowrap pb-0.5">
            <span className="font-mono text-zinc-500 mr-1 flex items-center gap-1 shrink-0">
              <Sparkles className="h-3 w-3 text-zinc-600" /> C-Rank:
            </span>
            {tiers.map((t) => (
              <button
                key={t.value}
                onClick={() => handleTierChange(t.value)}
                className={`rounded-lg px-3 py-1 font-mono text-[11px] sm:text-xs transition-all cursor-pointer shrink-0 ${
                  selectedTier === t.value
                    ? "bg-zinc-900 text-white font-semibold shadow-xs"
                    : "bg-zinc-100 hover:bg-zinc-200/70 text-zinc-600 border border-transparent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Language & Bucket Filter Pills */}
          <div className="flex flex-col gap-2.5 text-xs">
            {/* Language Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap pb-0.5">
              <span className="font-mono text-zinc-500 mr-1 flex items-center gap-1 shrink-0">
                <Code2 className="h-3 w-3 text-zinc-600" /> Lang:
              </span>
              {visibleLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLangChange(lang)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-[11px] sm:text-xs transition-all cursor-pointer shrink-0 ${
                    selectedLang === lang
                      ? "bg-zinc-900 text-white shadow-xs font-semibold"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 border border-transparent"
                  }`}
                >
                  {lang !== "All" && <LangLogo language={lang} />}
                  <span>{lang}</span>
                </button>
              ))}
              {languages.length > 10 && (
                <button
                  onClick={() => setShowAllLanguages(!showAllLanguages)}
                  className="font-mono text-[11px] text-zinc-700 font-semibold hover:underline px-2 py-1 cursor-pointer shrink-0"
                >
                  {showAllLanguages ? "Show Less" : `+${languages.length - 10} More`}
                </button>
              )}
            </div>

            {/* Stars Bucket Filter */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap pb-0.5">
              <span className="font-mono text-zinc-500 mr-1 flex items-center gap-1 shrink-0">
                <Star className="h-3 w-3 text-zinc-600" /> Stars:
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
          <div className="flex items-center gap-2 text-xs overflow-x-auto no-scrollbar whitespace-nowrap pb-0.5">
            <span className="font-mono text-zinc-500 mr-1 flex items-center gap-1 shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-600" /> First-Timer friendly:
            </span>
            {firstTimerBuckets.map((b) => (
              <button
                key={b}
                onClick={() => handleFirstTimerBucketChange(b)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[11px] sm:text-xs transition-all cursor-pointer shrink-0 ${
                  selectedFirstTimerBucket === b
                    ? "bg-zinc-900 text-white font-semibold shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 border border-transparent"
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
                className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 h-[260px] flex flex-col justify-between"
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
                  <div className="h-4 w-20 rounded bg-zinc-200" />
                  <div className="h-4 w-16 rounded bg-zinc-200" />
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
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <RepoCard repo={repo} isLoggedIn={isLoggedIn} />
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="rounded-3xl border border-dashed border-zinc-300 p-12 text-center bg-white shadow-2xs my-4"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 mb-3">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="text-base font-space font-bold text-zinc-900">No open doors found</h3>
            <p className="mt-1 text-xs text-zinc-500 font-sans max-w-sm mx-auto leading-relaxed">
              No repositories matched your selected language, star tier, or search query.
            </p>
            <button
              onClick={() => {
                setSelectedLang("All");
                setSelectedTier("All");
                setSelectedBucket("All");
                setSearchQuery("");
                setTrendingOnly(false);
                setPage(1);
                setLoading(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-mono font-semibold text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              Reset all filters →
            </button>
          </motion.div>
        )}
      </main>

      {/* SEO & Telemetry Intelligence Section */}
      <section className="border-t border-zinc-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold font-space text-zinc-900 lg:text-4xl">
              Stop submitting PRs to <span className="bg-[#dfd0b8]/80 text-zinc-900 px-2 rounded-lg">ghost towns.</span>
            </h2>
            <p className="mt-4 text-xs sm:text-sm lg:text-base text-zinc-600 leading-relaxed font-sans">
              Thousands of open-source contributors waste hours writing clean pull requests only to have them sit unreviewed for months. 
              <strong> Opendoor</strong> uses objective mathematical telemetry to grade repository maintainer responsiveness, merge velocity, and first-time contributor success.
            </p>
          </div>

          {/* Ecosystem Leaderboard Section */}
          <div className="grid grid-cols-1 gap-6 mb-16 font-mono">
            <div className="rounded-3xl bg-white p-6 sm:p-10 border border-zinc-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 font-space tracking-tight">
                    Top Welcoming Ecosystems
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-500 font-sans mt-1">
                    Rankings of open-source ecosystems that actively welcome external pull requests.
                  </p>
                </div>
                
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs text-zinc-400 font-sans font-semibold hidden sm:inline">Share:</span>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      "No more writing PRs for dead repos. opendoor grades public GitHub projects using mathematical PR merge rates and review times. Check out these rankings! 🚪✨\n\nhttps://opendoor.abhishekco.de"
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => posthog.capture("rankings_shared", { platform: "twitter" })}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-all font-sans cursor-pointer shadow-2xs"
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
                    onClick={() => posthog.capture("rankings_shared", { platform: "reddit" })}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-all font-sans cursor-pointer shadow-2xs"
                  >
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 11.5c0-1.65-1.35-3-3-3-.96 0-1.86.48-2.42 1.24-1.64-1-3.85-1.64-6.24-1.72l1.37-4.31 3.8 1.19c.14.78.8 1.38 1.63 1.38 1.05 0 1.9-.85 1.9-1.9s-.85-1.9-1.9-1.9c-.83 0-1.5.59-1.63 1.38l-4.14-1.3c-.2-.06-.41.04-.48.24l-1.52 4.8C5.9 7.82 3.69 8.46 2.05 9.46 1.48 8.7 0.58 8.22-.38 8.22c-1.65 0-3 1.35-3 3 0 1.21.72 2.26 1.77 2.73C-1.6 14.54-1.6 15.14-1.6 15.5c0 3.59 5.37 6.5 12 6.5s12-2.91 12-6.5c0-.36 0-.96-.02-1.53 1.05-.47 1.77-1.52 1.77-2.73z" />
                    </svg>
                    <span>Reddit</span>
                  </a>
                </div>
              </div>

              <div className="divide-y divide-zinc-100">
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
                  // Filter out low-sample ecosystems with fewer than 15 total repos or fewer than 3 welcoming repos to prevent 1-repo skewed rankings
                  .filter((item) => item.grandTotal >= 15 && (item.sCount + item.aCount) >= 3)
                  .sort((a, b) => b.weightedScore - a.weightedScore)
                  .slice(0, 5)
                  .map((item, idx) => {
                    const rankMedal = idx === 0 ? "1" : idx === 1 ? "2" : idx === 2 ? "3" : `${idx + 1}`;
                    return (
                      <div key={item.language} className="py-5 first:pt-2 last:pb-2 group transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-bold text-zinc-400 w-6">#{rankMedal}</span>
                            <div className="h-10 w-10 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center shrink-0">
                              <LangLogo language={item.language} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/rankings/${getLanguageSlug(item.language)}`}
                                  title={`View Top Welcoming Open-Source ${item.language} Repositories`}
                                  className="font-space text-lg font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors tracking-tight hover:underline"
                                >
                                  {item.language}
                                </Link>
                              </div>
                              <p className="text-xs text-zinc-500 font-sans mt-0.5">
                                Maintainers merge <strong>{item.sCount + item.aCount}</strong> welcoming projects with an avg <strong>{item.avg_merge_rate ? `${item.avg_merge_rate.toFixed(0)}%` : "84%"}</strong> acceptance rate.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 sm:gap-10 shrink-0 font-mono text-right pl-9 md:pl-0">
                            <div>
                              <div className="text-[11px] text-zinc-400 font-sans">Welcoming Repos</div>
                              <div className="text-sm font-bold text-zinc-900">
                                {item.sCount + item.aCount} <span className="text-xs text-zinc-400 font-normal">/ {item.grandTotal}</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-zinc-400 font-sans">Super Welcoming</div>
                              <div className="text-sm font-bold text-emerald-700">
                                {item.sCount}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-zinc-400 font-sans">Score</div>
                              <div className="inline-block px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 font-bold text-xs">
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

          {/* Telemetry Architecture Overview */}
          <div className="rounded-3xl border border-zinc-200 bg-[#faf9f6] p-8 sm:p-12 shadow-xs mb-16">
            <div className="max-w-3xl mb-10">
              <h3 className="text-2xl sm:text-3xl font-bold font-space text-zinc-900 tracking-tight">
                How Opendoor Eliminates Ghost-Town Repositories
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 font-sans mt-2 leading-relaxed">
                We do not rely on subjective opinions or vanity star counts. Opendoor queries raw GitHub GraphQL event streams continuously to compute real maintainer velocity metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-zinc-200 font-sans">
              <div className="space-y-2.5">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-mono font-bold text-xs">
                  01
                </div>
                <h4 className="font-space text-base font-bold text-zinc-900">GraphQL Telemetry Engine</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Calculates maintainer response latency down to the minute. PRs reviewed within 24 hours score highest in C-Rank™ calculations.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-mono font-bold text-xs">
                  02
                </div>
                <h4 className="font-space text-lg font-bold text-zinc-900">First-Timer Conversion Rate</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Evaluates the success rate of authors submitting their first PR to a repo. Excludes internal maintainer merges to preserve external contributor stats.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-mono font-bold text-xs">
                  03
                </div>
                <h4 className="font-space text-lg font-bold text-zinc-900">Verified Contributor Badges</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Sign in with GitHub to cross-reference merged commits. Reviews submitted by verified contributors carry weighted maintainer sentiment points.
                </p>
              </div>
            </div>
          </div>

          {/* GitHub Sign-In / Contributor Action Banner */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 sm:p-12 text-zinc-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-xl">
              <h3 className="text-2xl sm:text-3xl font-bold font-space tracking-tight leading-tight">
                Ready to find your next welcoming open-source contribution?
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-zinc-600 leading-relaxed font-sans">
                {isLoggedIn
                  ? "Explore indexed repositories above or filter by your favorite tech stack to find open doors."
                  : "Sign in with your GitHub account to watch repositories, unlock maintainer guidelines, and receive automated PR review alerts."}
              </p>
            </div>
            {isLoggedIn ? (
              <button
                onClick={() => {
                  const gridEl = document.getElementById("leaderboard-grid");
                  if (gridEl) {
                    gridEl.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="inline-flex items-center gap-2.5 rounded-xl bg-zinc-900 px-7 py-3.5 font-sans text-sm font-semibold text-white hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <span>Explore Welcoming Repos</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <a
                href={`${API_BASE_URL}/api/v1/auth/github`}
                onClick={() => posthog.capture("github_sign_in_clicked", { source: "homepage_cta_banner" })}
                className="inline-flex items-center gap-2.5 rounded-xl bg-zinc-900 px-7 py-3.5 font-sans text-sm font-semibold text-white hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <span>Sign in with GitHub</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </section>

      <Footer />

      {/* Auth Modal Component */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title={authModalConfig.title}
        description={authModalConfig.description}
        source={authModalConfig.source}
      />

      <AnimatePresence>
        {isSearchModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-zinc-950/40 backdrop-blur-sm"
            onClick={() => setIsSearchModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Search Input Header */}
              <div className="relative flex items-center border-b border-zinc-100 bg-zinc-50/50 p-4">
                <Search className="absolute left-5 h-5 w-5 text-zinc-400" />
                <input
                  ref={searchModalInputRef}
                  type="text"
                  placeholder={`Search repositories by name, e.g. ${famousRepos[placeholderIndex]}`}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-24 py-1.5 text-base font-sans text-zinc-900 placeholder-zinc-400 focus:outline-none bg-transparent"
                  autoFocus
                />
                <div className="absolute right-4 flex items-center gap-2">
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-400 shadow-2xs">
                    ESC
                  </kbd>
                  <button
                    onClick={() => setIsSearchModalOpen(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body / Results Container */}
              <div className="max-h-96 overflow-y-auto p-3 space-y-1 font-sans divide-y divide-zinc-100">
                {repos.length > 0 ? (
                  repos.slice(0, 6).map((r) => {
                    const rankTier = r.class_rank || r.c_rank_tier || "A";
                    return (
                      <a
                        key={r.id || r.full_name}
                        href={`/${r.full_name}`}
                        onClick={() => setIsSearchModalOpen(false)}
                        title={`View ${r.full_name} C-Rank scorecard, PR response time & merge metrics`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition-colors group cursor-pointer block no-underline text-current pt-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://github.com/${r.full_name?.split('/')[0]}.png`}
                            alt={r.full_name}
                            className="h-8 w-8 rounded-lg border border-zinc-200 bg-white shrink-0 object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png";
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-space text-sm font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors truncate">
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
                          <span className={`px-2 py-0.5 text-[10px] font-bold font-mono border rounded-lg ${
                            rankTier === "S" ? "bg-emerald-50 text-emerald-900 border-emerald-300" :
                            rankTier === "A" ? "bg-blue-50 text-blue-900 border-blue-200" : "bg-amber-50 text-amber-900 border-amber-200"
                          }`}>
                            {rankTier} Rank
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

              {/* Modal Footer */}
              <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>Press <kbd className="bg-zinc-200 px-1 py-0.5 rounded text-zinc-700">ESC</kbd> to close</span>
                <button
                  onClick={() => setIsSearchModalOpen(false)}
                  className="text-zinc-900 font-semibold hover:underline cursor-pointer"
                >
                  View all explorer results →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
