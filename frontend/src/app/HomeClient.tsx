"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RepoCard } from "@/components/RepoCard";
import { LangLogo } from "@/components/LangLogo";
import { Repo, MacroStats } from "@/types/opendoor";
import {
  Search,
  Flame,
  Star,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  GitPullRequest,
  Briefcase,
  Activity,
} from "lucide-react";
import { motion, useMotionValue, animate, useInView } from "framer-motion";
import { FloatingRepoCircles } from "@/components/FloatingRepoCircles";
import { API_BASE_URL } from "@/lib/api";
import { getLanguageSlug } from "@/lib/languageSlug";
import { captureReferralFromUrl } from "@/lib/referral";
import posthog from "posthog-js";
import Link from "next/link";
import { AuthModal } from "@/components/AuthModal";
import { LanguageMatchQuiz } from "@/components/LanguageMatchQuiz";
import { TopMatches } from "@/components/TopMatches";
import { useSearch } from "@/context/SearchContext";
import { EASE_OUT_EXPO, useReducedMotion } from "@/lib/motion";

interface HomeClientProps {
  initialStats: MacroStats | null;
  initialRepos?: Repo[];
  initialSpotlightRepos?: Repo[];
}

function CountUp({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(value);
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!isInView) return;
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    count.set(0);
    const controls = animate(count, value, {
      duration,
      ease: EASE_OUT_EXPO,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [isInView, value, duration, reduceMotion, count]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

export default function HomeClient({
  initialStats,
  initialRepos = [],
  initialSpotlightRepos = [],
}: HomeClientProps) {
  const [repos, setRepos] = useState<Repo[]>(initialRepos);
  const [stats, setStats] = useState<MacroStats | null>(initialStats);
  const [selectedLang, setSelectedLang] = useState<string>("All");
  const [selectedBucket, setSelectedBucket] = useState<string>("All");
  const [selectedTier, setSelectedTier] = useState<string>("S");
  const [selectedMinMergeRate, setSelectedMinMergeRate] = useState<string>("All");
  const [selectedFirstTimerBucket, setSelectedFirstTimerBucket] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [trendingOnly, setTrendingOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(initialRepos.length === 0);

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
  const perPage = 15;

  // Search integration with GlobalSearch & Header
  const { openSearch, setHeroSearchVisible } = useSearch();
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

  // Persist referral attribution from /?ref=CODE for 30 days (AC1)
  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % famousRepos.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [famousRepos.length]);

  // Manage header search trigger visibility via IntersectionObserver on #hero-search-container
  useEffect(() => {
    if (!heroSearchRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeroSearchVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(heroSearchRef.current);
    return () => {
      observer.disconnect();
      setHeroSearchVisible(false);
    };
  }, [setHeroSearchVisible]);

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

    if (selectedFirstTimerBucket === "has_gfi") {
      params.set("has_good_first_issue", "true");
    } else {
      const firstTimerBounds = getFirstTimerBoundsFromBucket(selectedFirstTimerBucket);
      if (firstTimerBounds.min) {
        params.set("min_first_timer_success_rate", firstTimerBounds.min);
      }
      if (firstTimerBounds.max) {
        params.set("max_first_timer_success_rate", firstTimerBounds.max);
      }
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

  const [spotlightRepos, setSpotlightRepos] = useState<Repo[]>(initialSpotlightRepos);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/repos?scored_today=true&max_last_activity_days=7&exclude_stale=true&exclude_fallback=true&min_tier=B&min_stars=500&sort=c_rank_score&order=desc&per_page=30`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const rawList = data?.data || data?.repos;
        if (Array.isArray(rawList) && rawList.length > 0) {
          const mapped: Repo[] = rawList.map((r: Record<string, unknown>) => ({
            ...(r as unknown as Repo),
            c_rank_tier: (r.c_rank_tier as string) || (r.class_rank as string) || "",
            class_rank: (r.class_rank as string) || (r.c_rank_tier as string) || "",
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

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent">
      <Header
        searchQuery={searchQuery}
        placeholderText={`Search repositories, e.g. ${famousRepos[placeholderIndex]}`}
      />

      {/* Hero Section - Clean, data-forward with calibrated ambient glass glow & floating S-tier repos */}
      <section className="relative mx-auto max-w-6xl px-4 pt-20 pb-12 text-center sm:px-6 lg:px-8 overflow-visible">
        {/* Ambient atmospheric glows */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 -z-10 h-[380px] w-[600px] max-w-full opacity-60 blur-3xl overflow-hidden">
          <div className="h-full w-full rounded-full bg-gradient-to-tr from-emerald-500/10 via-amber-500/5 to-orange-500/15" />
        </div>

        {/* Dynamic floating circles of top S-tier repos */}
        <FloatingRepoCircles repos={repos} />

        {/* Live radar badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono font-medium text-emerald-400 backdrop-blur-md mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>
            RADAR: {stats?.total_repos ? `${stats.total_repos.toLocaleString()}+` : "1,000+"} REPOSITORIES MONITORED IN REAL-TIME
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="text-4xl font-bold tracking-tight text-white sm:text-6xl font-sans leading-[1.1]"
        >
          Find repos that <span className="text-shimmer font-extrabold">actually merge</span> your PRs.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.1 }}
          className="mx-auto mt-5 max-w-xl text-base text-[#a3a3a3] sm:text-lg leading-relaxed font-sans"
        >
          GetMerged tracks real reviewer response times, merge rates, and beginner-friendly maintainers - so you never waste hours on ignored pull requests.
        </motion.p>

        {/* Hero Search Bar */}
        <motion.div
          id="hero-search-container"
          ref={heroSearchRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.2 }}
          className="mt-8 max-w-2xl mx-auto"
        >
          <div
            onClick={() => openSearch(searchQuery)}
            className="relative flex items-center rounded-xl border border-white/[0.12] bg-[#141414]/70 backdrop-blur-xl px-4 py-3.5 hover:border-white/[0.22] hover:bg-[#1a1a1a]/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.4)] transition-all cursor-pointer group"
          >
            <Search className="h-5 w-5 text-[#a3a3a3] group-hover:text-[#d4d4d4] shrink-0 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              readOnly
              placeholder={`Search repositories, e.g. ${famousRepos[placeholderIndex]}`}
              value={searchQuery}
              className="w-full pl-3 pr-20 text-sm text-white placeholder-[#737373] focus:outline-none font-sans bg-transparent cursor-pointer"
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
                  className="pointer-events-auto text-xs font-mono text-[#a3a3a3] hover:text-[#d4d4d4] mr-1"
                >
                  Clear
                </button>
              ) : null}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#a3a3a3]">
                <span>⌘</span>K
              </kbd>
            </div>
          </div>

          {/* Quick-explore chips */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs">
            <span className="font-mono text-[#737373]">Quick explore:</span>
            {["nextjs", "react", "rust", "bun", "fastapi"].map((term, i) => (
              <motion.button
                key={term}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.3 + i * 0.05 }}
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSearchQuery(term);
                  setLoading(true);
                  setPage(1);
                  posthog.capture("repo_searched", { query: term, source: "hero_chip" });
                  const gridEl = document.getElementById("leaderboard-grid");
                  if (gridEl) {
                    gridEl.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="rounded-lg border border-white/[0.08] bg-[#141414]/60 backdrop-blur-md px-2.5 py-1 font-mono text-[#a3a3a3] hover:border-white/[0.18] hover:text-white hover:bg-[#1f1f1f]/80 cursor-pointer transition-all shadow-xs"
              >
                {term}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Personalized matches from GitHub-imported skills (hidden when signed out or empty) */}
        {isLoggedIn && (
          <div className="mt-10">
            <TopMatches />
          </div>
        )}

        {/* Macro Telemetry Grid */}
        <motion.div
          className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-3xl mx-auto rounded-2xl bg-[#141414]/70 backdrop-blur-xl p-4 sm:p-5 border border-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_12px_32px_-8px_rgba(0,0,0,0.5)] items-center text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {stats?.avg_response_hours ? "82%" : <div className="h-6 w-12 bg-[#1c1c1c] rounded animate-pulse mx-auto" />}
            </div>
            <div className="text-[11px] sm:text-xs text-[#a3a3a3] font-mono">Avg Merge Rate</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {stats?.avg_response_hours ? (
                stats.avg_response_hours < 1
                  ? "<1h"
                  : stats.avg_response_hours < 24
                  ? `${Math.floor(stats.avg_response_hours)}h`
                  : `${Math.floor(stats.avg_response_hours / 24)}d+`
              ) : (
                <div className="h-6 w-12 bg-[#1c1c1c] rounded animate-pulse mx-auto" />
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-[#a3a3a3] font-mono">Avg First Review</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {stats?.s_class_count !== undefined ? (
                <CountUp value={stats.s_class_count} />
              ) : (
                <div className="h-6 w-12 bg-[#1c1c1c] rounded animate-pulse mx-auto" />
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-[#a3a3a3] font-mono">Welcoming Repos</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {stats?.total_repos ? (
                <CountUp value={stats.total_repos} />
              ) : (
                <div className="h-6 w-12 bg-[#1c1c1c] rounded animate-pulse mx-auto" />
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-[#a3a3a3] font-mono">Repos Scored</div>
          </div>
        </motion.div>

        {/* 3-Pillar Platform Interlinking Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto text-left">
          {/* Pillar 1: Contributors & PR Tracking */}
          <Link
            href="/dashboard"
            className="p-5 rounded-xl border border-white/[0.1] bg-[#141414]/90 hover:bg-[#1c1c1c] hover:border-emerald-500/40 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <GitPullRequest className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  For Contributors
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                Track Open PRs & Forecasts
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-sans">
                Real-time review velocity alerts, merge probability scores, and contributor onboarding quests.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-mono font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Open Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </Link>

          {/* Pillar 2: For Maintainers */}
          <Link
            href="/maintainers"
            className="p-5 rounded-xl border border-white/[0.1] bg-[#141414]/90 hover:bg-[#1c1c1c] hover:border-amber-500/40 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  For Maintainers
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                Claim Repo & Boost Turnaround
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-sans">
                Claim your C-Rank scorecard, embed review SLAs, and attract high-quality beginner PRs.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-mono font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>Maintainer Console</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </Link>

          {/* Pillar 3: For Hiring & Talent */}
          <Link
            href="/talent"
            className="p-5 rounded-xl border border-white/[0.1] bg-[#141414]/90 hover:bg-[#1c1c1c] hover:border-blue-500/40 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Briefcase className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  For Hiring Teams
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                Hire Verified Contributors
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-sans">
                Source software engineers with proven merge records and verified open source Karma scores.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-mono font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
              <span>Search Talent</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </Link>
        </div>
      </section>

      {/* Problem-Solution Section - Split layout */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          {/* Left: Problem statement */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#ff6b00]">
              <Star className="h-3.5 w-3.5 fill-[#ff6b00]" /> Beyond GitHub Stars
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight font-sans">
              Stars measure popularity. C-Rank measures active maintainers.
            </h2>
            <p className="text-sm text-[#a3a3a3] font-sans leading-relaxed">
              A repository with 40,000 stars might have unanswered PRs from months ago. When you pick projects by stars alone, you often run into backlogged, exhausted teams. GetMerged checks whether maintainers are actually reviewing and merging community pull requests today.
            </p>
            <Link
              href="/how-c-rank-works"
              title="Learn how GetMerged scores open source projects"
              className="inline-flex items-center gap-2 text-xs font-mono font-bold text-white hover:text-[#a3a3a3] transition-colors"
            >
              <span>See how scoring works</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Right: Live activity contrast */}
          <div className="bg-[#141414] border border-white/[0.08] rounded-xl p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="text-[#a3a3a3]">Real GitHub Activity</span>
              <span className="text-[#10b981] font-bold">Live Data</span>
            </div>
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-[#0a0a0a] border border-[#f87171]/30">
                <div className="flex justify-between text-[#d4d4d4] font-bold mb-1">
                  <span>Backlogged Repository</span>
                  <span className="text-[#f87171]">45k ★</span>
                </div>
                <div className="text-[11px] text-[#a3a3a3] font-sans leading-relaxed">
                  Median PR review wait: <strong className="text-[#f87171]">140+ days</strong>
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#0a0a0a] border border-[#10b981]/30">
                <div className="flex justify-between text-[#d4d4d4] font-bold mb-1">
                  <span>Active &amp; Welcoming Repo</span>
                  <span className="text-[#10b981]">1.8k ★</span>
                </div>
                <div className="text-[11px] text-[#a3a3a3] font-sans leading-relaxed">
                  Median PR review wait: <strong className="text-[#10b981]">&lt;6 hours</strong>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Today's Top Repos - Spotlight */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 font-sans">
              <Flame className="h-5 w-5 text-[#ff6b00] fill-[#ff6b00]" /> Today&apos;s Open Doors
            </h2>
            <p className="text-xs text-[#737373] font-sans mt-0.5">Verified active maintainers merging community contributions right now.</p>
          </div>
          <Link
            href="/hall-of-fame"
            title="View S-Tier Hall of Fame repositories"
            className="text-xs font-mono font-bold text-[#10b981] hover:text-[#a3a3a3] inline-flex items-center gap-1 shrink-0"
          >
            View S-Tier Hall of Fame <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {spotlightRepos.length === 0 && loading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#141414] p-5 h-[260px] flex flex-col justify-between"
              >
                <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-[#1c1c1c] animate-pulse" />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-5 w-32 rounded bg-[#1c1c1c]" />
                    <div className="h-5 w-16 rounded bg-[#1c1c1c]" />
                  </div>
                  <div className="h-3 w-full rounded bg-[#1c1c1c] mb-2" />
                  <div className="h-3 w-3/4 rounded bg-[#1c1c1c] mb-5" />
                  <div className="h-10 w-full rounded bg-[#1c1c1c] border border-white/[0.04] mb-4" />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                  <div className="h-4 w-20 rounded bg-[#1c1c1c]" />
                  <div className="h-4 w-16 rounded bg-[#1c1c1c]" />
                </div>
              </div>
            ))
          ) : spotlightRepos.length > 0 ? (
            spotlightRepos.slice(0, 3).map((r, idx) => (
              <RepoCard key={r.id || r.full_name} repo={r} isLoggedIn={isLoggedIn} isSpotlight={true} spotlightIndex={idx} />
            ))
          ) : null}
        </div>
      </section>

      {/* C-Rank Factors - Horizontal layout, no eyebrows */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          {/* Left: Factor list */}
          <div className="bg-[#141414] border border-white/[0.08] rounded-xl p-6 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center text-[#a3a3a3] border-b border-white/[0.08] pb-3">
              <span>How We Score Repositories</span>
              <span className="text-[#10b981] font-bold">Continuous</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-[#0a0a0a] p-2.5 rounded-lg border border-white/[0.04]">
                <span className="text-[#a3a3a3]">External PR Merge Rate</span>
                <span className="text-[#10b981] font-bold">Primary</span>
              </div>
              <div className="flex justify-between items-center bg-[#0a0a0a] p-2.5 rounded-lg border border-white/[0.04]">
                <span className="text-[#a3a3a3]">Review Response Time</span>
                <span className="text-[#38bdf8] font-bold">Core</span>
              </div>
              <div className="flex justify-between items-center bg-[#0a0a0a] p-2.5 rounded-lg border border-white/[0.04]">
                <span className="text-[#a3a3a3]">Recent Commit Activity</span>
                <span className="text-[#c084fc] font-bold">Core</span>
              </div>
              <div className="flex justify-between items-center bg-[#0a0a0a] p-2.5 rounded-lg border border-white/[0.04]">
                <span className="text-[#a3a3a3]">First-Timer Onboarding</span>
                <span className="text-[#fbbf24] font-bold">Hospitality</span>
              </div>
            </div>
          </div>

          {/* Right: Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#38bdf8]">
              <Sparkles className="h-3.5 w-3.5" /> Transparent Metrics
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight font-sans">
              9 real signals. Zero guesswork.
            </h2>
            <p className="text-sm text-[#a3a3a3] font-sans leading-relaxed">
              GetMerged tracks active pull requests across 20+ programming languages - measuring real review turnaround, newcomer acceptance, and maintainer responsiveness.
            </p>
            <Link
              href="/how-c-rank-works"
              title="Learn how GetMerged scores repositories"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1c1c1c] border border-white/[0.08] px-5 py-2.5 font-sans text-xs font-semibold text-white hover:bg-[#262626] hover:border-white/[0.16] transition-all"
            >
              <span>See how scoring works</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Maintainer CTA - Full width banner */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          className="rounded-xl bg-[#141414] border border-white/[0.08] p-8 sm:p-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#10b981]">
                <ShieldCheck className="h-3.5 w-3.5" /> For Maintainers
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">
                Maintain an open source repo? See your contributor experience.
              </h2>
              <p className="text-sm text-[#a3a3a3] font-sans leading-relaxed">
                Discover your review response grade, outside PR merge rates, and where prospective contributors might encounter bottlenecks.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openSearch()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-mono text-xs font-bold rounded-lg hover:bg-[#ff8a33] cursor-pointer transition-colors"
                >
                  <Search className="h-3.5 w-3.5" /> Check Your Repository
                </button>
                <Link
                  href="/guides/how-to-know-if-maintainer-will-review"
                  title="Maintainer Best Practices"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1c1c1c] border border-white/[0.08] text-white font-mono text-xs font-bold rounded-lg hover:bg-[#262626] transition-colors"
                >
                  Read Playbook <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-xl p-6 space-y-3 font-mono text-xs">
              <div className="font-bold text-white border-b border-white/[0.08] pb-2 flex items-center justify-between">
                <span>Maintainer Health Check</span>
                <span className="text-[#10b981]">Live</span>
              </div>
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-[#a3a3a3]">
                  <CheckCircle2 className="h-4 w-4 text-[#10b981] shrink-0" />
                  <span>Median Review Wait &lt; 24h</span>
                </div>
                <div className="flex items-center gap-2 text-[#a3a3a3]">
                  <CheckCircle2 className="h-4 w-4 text-[#10b981] shrink-0" />
                  <span>Outside PR Merge Rate &gt; 65%</span>
                </div>
                <div className="flex items-center gap-2 text-[#a3a3a3]">
                  <CheckCircle2 className="h-4 w-4 text-[#10b981] shrink-0" />
                  <span>Multiple Active Reviewers</span>
                </div>
                <div className="flex items-center gap-2 text-[#a3a3a3]">
                  <CheckCircle2 className="h-4 w-4 text-[#10b981] shrink-0" />
                  <span>Active Good First Issues</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main Curated Showroom Section */}
      <main id="leaderboard-grid" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex-1 w-full pt-4">
        {/* Category Switcher */}
        <div className="mb-8 rounded-xl bg-[#141414] p-5 sm:p-6 border border-white/[0.08] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                Explore Open Doors by Category
              </h2>
            </div>

            <Link
              href="/repos"
              title="Open full multi-filter repository directory"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1c1c1c] border border-white/[0.08] hover:bg-[#262626] text-white px-5 py-2.5 text-xs font-semibold transition-all self-start md:self-auto"
            >
              <span>Explore All {stats?.total_repos ? `${stats.total_repos.toLocaleString()} ` : ""}Repositories</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 text-xs font-sans">
            <motion.button
              type="button"
              aria-pressed={selectedTier === "S" && selectedFirstTimerBucket === "All" && selectedMinMergeRate === "All" && selectedBucket === "All"}
              title="Filter repositories by S-Tier Hall of Fame"
              onClick={() => {
                setTrendingOnly(false);
                setSelectedTier("S");
                setSelectedFirstTimerBucket("All");
                setSelectedBucket("All");
                setSelectedMinMergeRate("All");
                setPage(1);
              }}
              whileTap={{ scale: 0.96 }}
              className={`px-4 py-2 rounded-lg font-bold transition-all shrink-0 cursor-pointer border ${
                selectedTier === "S" && selectedFirstTimerBucket === "All" && selectedMinMergeRate === "All" && selectedBucket === "All"
                  ? "bg-[#fbbf24] text-black border-[#fbbf24]"
                  : "bg-[#1c1c1c] text-[#d4d4d4] border-white/[0.08] hover:border-white/[0.16]"
              }`}
            >
              Hall of Fame
            </motion.button>

            <motion.button
              type="button"
              aria-pressed={selectedTier === "A" && selectedFirstTimerBucket === "All" && selectedMinMergeRate === "All" && selectedBucket === "All"}
              title="Filter repositories by Welcoming (A-Tier)"
              onClick={() => {
                setTrendingOnly(false);
                setSelectedTier("A");
                setSelectedFirstTimerBucket("All");
                setSelectedBucket("All");
                setSelectedMinMergeRate("All");
                setPage(1);
              }}
              whileTap={{ scale: 0.96 }}
              className={`px-4 py-2 rounded-lg font-bold transition-all shrink-0 cursor-pointer border ${
                selectedTier === "A"
                  ? "bg-[#10b981] text-white border-[#10b981]"
                  : "bg-[#1c1c1c] text-[#d4d4d4] border-white/[0.08] hover:border-white/[0.16]"
              }`}
            >
              Welcoming
            </motion.button>

            <motion.button
              type="button"
              aria-pressed={selectedBucket === "50k+"}
              title="Filter repositories with 50k+ stars"
              onClick={() => {
                setTrendingOnly(false);
                setSelectedTier("All");
                setSelectedFirstTimerBucket("All");
                setSelectedBucket("50k+");
                setSelectedMinMergeRate("All");
                setPage(1);
              }}
              whileTap={{ scale: 0.96 }}
              className={`px-4 py-2 rounded-lg font-bold transition-all shrink-0 cursor-pointer border ${
                selectedBucket === "50k+"
                  ? "bg-[#c084fc] text-white border-[#c084fc]"
                  : "bg-[#1c1c1c] text-[#d4d4d4] border-white/[0.08] hover:border-white/[0.16]"
              }`}
            >
              Star Giants
            </motion.button>

            <motion.button
              type="button"
              aria-pressed={selectedFirstTimerBucket === "has_gfi"}
              title="Filter repositories with good first issues"
              onClick={() => {
                setTrendingOnly(false);
                setSelectedTier("All");
                setSelectedFirstTimerBucket("has_gfi");
                setSelectedBucket("All");
                setSelectedMinMergeRate("All");
                setPage(1);
              }}
              whileTap={{ scale: 0.96 }}
              className={`px-4 py-2 rounded-lg font-bold transition-all shrink-0 cursor-pointer border ${
                selectedFirstTimerBucket === "has_gfi"
                  ? "bg-[#38bdf8] text-white border-[#38bdf8]"
                  : "bg-[#1c1c1c] text-[#d4d4d4] border-white/[0.08] hover:border-white/[0.16]"
              }`}
            >
              Has Good First Issue
            </motion.button>

            <motion.button
              type="button"
              aria-pressed={selectedMinMergeRate === "60%"}
              title="Filter repositories with high merge rate (>= 60%)"
              onClick={() => {
                setTrendingOnly(false);
                setSelectedTier("All");
                setSelectedFirstTimerBucket("All");
                setSelectedBucket("All");
                setSelectedMinMergeRate("60%");
                setPage(1);
              }}
              whileTap={{ scale: 0.96 }}
              className={`px-4 py-2 rounded-lg font-bold transition-all shrink-0 cursor-pointer border ${
                selectedMinMergeRate === "60%"
                  ? "bg-[#f87171] text-white border-[#f87171]"
                  : "bg-[#1c1c1c] text-[#d4d4d4] border-white/[0.08] hover:border-white/[0.16]"
              }`}
            >
              High Merge Rate
            </motion.button>

            <motion.button
              type="button"
              aria-pressed={selectedFirstTimerBucket === "60-80%"}
              title="Filter repositories with awesome first-timer acceptance (> 60%)"
              onClick={() => {
                setTrendingOnly(false);
                setSelectedTier("All");
                setSelectedFirstTimerBucket("60-80%");
                setSelectedBucket("All");
                setSelectedMinMergeRate("All");
                setPage(1);
              }}
              whileTap={{ scale: 0.96 }}
              className={`px-4 py-2 rounded-lg font-bold transition-all shrink-0 cursor-pointer border ${
                selectedFirstTimerBucket === "60-80%"
                  ? "bg-[#ff6b00] text-white border-[#ff6b00]"
                  : "bg-[#1c1c1c] text-[#d4d4d4] border-white/[0.08] hover:border-white/[0.16]"
              }`}
            >
              First Timer Awesome
            </motion.button>
          </div>
        </div>

        {/* Repos Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-10">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#141414] p-6 h-[260px] animate-pulse"
              />
            ))}
          </div>
        ) : repos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
              {repos.slice(0, 6).map((repo, index) => (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: index * 0.04 }}
                >
                  <RepoCard repo={repo} isLoggedIn={isLoggedIn} />
                </motion.div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="my-8 rounded-xl bg-[#141414] border border-white/[0.08] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white font-sans">
                  Looking for custom languages or merge rates?
                </h3>
                <p className="text-xs text-[#737373] mt-1 font-sans">
                  Filter across 20+ ecosystems with full pagination.
                </p>
              </div>

              <Link
                href="/repos"
                title="Browse full repository database with all filters"
                className="inline-flex items-center gap-2 rounded-lg bg-[#ff6b00] text-white hover:bg-[#ff8a33] px-6 py-3 text-xs font-bold font-sans shrink-0 transition-colors"
              >
                <span>Open Explorer</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="rounded-xl border border-dashed border-white/[0.12] p-12 text-center bg-[#141414] my-4"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#1c1c1c] text-[#a3a3a3] mb-3">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white font-sans">No open doors found</h3>
            <p className="mt-1 text-xs text-[#737373] font-sans max-w-sm mx-auto leading-relaxed">
              No repositories matched your filters.
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
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1c1c1c] border border-white/[0.08] px-4 py-2 text-xs font-mono font-semibold text-white hover:bg-[#262626] active:scale-95 transition-all cursor-pointer"
            >
              Reset all filters
            </button>
          </motion.div>
        )}
      </main>

      {/* Ecosystem Rankings */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white lg:text-4xl font-sans">
            Top welcoming ecosystems
          </h2>
          <p className="mt-4 text-xs sm:text-sm lg:text-base text-[#a3a3a3] leading-relaxed font-sans">
            Ranked by a composite index of maintainer merge velocity (70%) and active ecosystem opportunity depth (30%).
          </p>
        </div>

        <div className="rounded-xl bg-[#141414] border border-white/[0.08] p-6 sm:p-10">
          <div className="divide-y divide-white/[0.08]">
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
                const dCount = item.tier_map?.["D"] || 0;
                const grandTotal = item.total || sCount + aCount + bCount + cCount + dCount || 1;

                const sPct = (sCount / grandTotal) * 100;
                const aPct = (aCount / grandTotal) * 100;
                const bPct = (bCount / grandTotal) * 100;
                const cPct = (cCount / grandTotal) * 100;
                const dPct = (dCount / grandTotal) * 100;

                // Score powered directly by backend API (protecting trade secrets)
                const score = item.score !== undefined && item.score > 0 ? item.score : 40.0;
                const welcomingTotal = item.welcoming_count ?? (sCount + aCount);

                return {
                  ...item,
                  sCount,
                  aCount,
                  bCount,
                  cCount,
                  dCount,
                  grandTotal,
                  sPct,
                  aPct,
                  bPct,
                  cPct,
                  dPct,
                  score,
                  welcomingTotal,
                };
              })
              .filter((item) => item.grandTotal >= 15 && (item.sCount + item.aCount) >= 3)
              .sort((a, b) => b.score - a.score)
              .slice(0, 10)
              .map((item, idx) => {
                const rankMedal = idx === 0 ? "1" : idx === 1 ? "2" : idx === 2 ? "3" : `${idx + 1}`;
                return (
                  <motion.div
                    key={item.language}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.35, ease: EASE_OUT_EXPO, delay: idx * 0.05 }}
                    className="py-5 first:pt-2 last:pb-2 group transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-[#737373] w-6">#{rankMedal}</span>
                        <div className="h-10 w-10 rounded-lg bg-[#1c1c1c] border border-white/[0.08] flex items-center justify-center shrink-0">
                          <LangLogo language={item.language} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/rankings/${getLanguageSlug(item.language)}`}
                              title={`Top Welcoming Open-Source ${item.language} Repositories`}
                              className="text-lg font-bold text-white group-hover:text-[#a3a3a3] transition-colors tracking-tight hover:underline font-sans"
                            >
                              {item.language}
                            </Link>
                          </div>
                          <p className="text-xs text-[#737373] font-sans mt-0.5">
                            <strong className="text-[#d4d4d4]">{item.sCount + item.aCount}</strong> welcoming projects, avg <strong className="text-[#d4d4d4]">{item.avg_merge_rate ? `${item.avg_merge_rate.toFixed(0)}%` : "84%"}</strong> acceptance.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 shrink-0 font-mono pl-9 lg:pl-0">
                        <div className="flex flex-col gap-1 w-full sm:w-56">
                          <div className="flex items-center justify-between text-[11px] font-sans text-[#737373]">
                            <span>Tier Spread</span>
                            <span className="font-mono text-[10px]">{item.grandTotal} repos</span>
                          </div>
                          <div
                            className="h-2.5 w-full rounded-full bg-[#1c1c1c] p-0.5 flex overflow-hidden border border-white/[0.04]"
                            title={`S: ${item.sCount}, A: ${item.aCount}, B: ${item.bCount}, C/D: ${item.cCount + item.dCount}`}
                          >
                            {item.sPct > 0 && (
                              <div
                                style={{ width: `${item.sPct}%` }}
                                className="h-full bg-[#fbbf24] rounded-l-full first:rounded-l-full last:rounded-r-full transition-all"
                              />
                            )}
                            {item.aPct > 0 && (
                              <div
                                style={{ width: `${item.aPct}%` }}
                                className="h-full bg-[#10b981] first:rounded-l-full last:rounded-r-full transition-all"
                              />
                            )}
                            {item.bPct > 0 && (
                              <div
                                style={{ width: `${item.bPct}%` }}
                                className="h-full bg-[#38bdf8] first:rounded-l-full last:rounded-r-full transition-all"
                              />
                            )}
                            {(item.cPct + item.dPct) > 0 && (
                              <div
                                style={{ width: `${item.cPct + item.dPct}%` }}
                                className="h-full bg-[#525252] rounded-r-full first:rounded-l-full last:rounded-r-full transition-all"
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#737373]">
                            <span className="text-[#fbbf24] font-semibold">{item.sCount} S</span>
                            <span className="text-[#10b981] font-semibold">{item.aCount} A</span>
                            <span className="text-[#38bdf8] font-semibold">{item.bCount} B</span>
                            <span>{item.cCount + item.dCount} C/D</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-right shrink-0">
                          <div>
                            <div className="text-[11px] text-[#737373] font-sans">Welcoming</div>
                            <div className="text-sm font-bold text-white">
                              {item.sCount + item.aCount}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-[#737373] font-sans">Score</div>
                            <div className="inline-block px-2.5 py-1 rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-white font-bold text-xs">
                              {item.score.toFixed(1)} pts
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </div>
      </section>

      {/* How It Works - 3 columns */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
            How GetMerged works
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] font-sans mt-2 leading-relaxed">
            We query raw GitHub GraphQL event streams to compute real maintainer velocity metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 font-sans">
          <div className="space-y-2.5">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-white font-mono font-bold text-xs">
              01
            </div>
            <h4 className="text-base font-bold text-white">Review Speed</h4>
            <p className="text-xs text-[#a3a3a3] leading-relaxed">
              We calculate how quickly maintainers post actionable reviews. Projects replying within 24 hours score highest.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-white font-mono font-bold text-xs">
              02
            </div>
            <h4 className="text-base font-bold text-white">New Contributor Merge Rate</h4>
            <p className="text-xs text-[#a3a3a3] leading-relaxed">
              Measures the success rate of developers opening their very first PR, filtering out internal bot merges.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-white font-mono font-bold text-xs">
              03
            </div>
            <h4 className="text-base font-bold text-white">Verified Reviews</h4>
            <p className="text-xs text-[#a3a3a3] leading-relaxed">
              Sign in with GitHub to share genuine feedback on your contributor onboarding experience.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-xl bg-[#141414] border border-white/[0.08] p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight font-sans">
              Ready to find your next contribution?
            </h3>
            <p className="mt-3 text-xs sm:text-sm text-[#a3a3a3] leading-relaxed font-sans">
              {isLoggedIn
                ? "Explore indexed repositories above or filter by your favorite tech stack."
                : "Sign in with GitHub to watch repositories, unlock maintainer guidelines, and receive PR review alerts."}
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
              className="inline-flex items-center gap-2.5 rounded-lg bg-[#ff6b00] px-7 py-3.5 font-sans text-sm font-semibold text-white hover:bg-[#ff8a33] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
            >
              <span>Explore Repos</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => openAuthModal("Sign in to GetMerged", "Sign in to access trending repositories and contributor insights.", "homepage_cta_banner")}
              title="Sign in to GetMerged"
              className="inline-flex items-center gap-2.5 rounded-lg bg-[#ff6b00] px-7 py-3.5 font-sans text-sm font-semibold text-white hover:bg-[#ff8a33] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
            >
              <span>Sign in to GetMerged</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {/* Language Quiz */}
      <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <LanguageMatchQuiz />
      </div>

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
