"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { LanguageTierBreakdown, MacroStats, Repo } from "@/types/opendoor";

export interface HomeDataProps {
  initialStats: MacroStats | null;
  initialRepos?: Repo[];
  initialSpotlightRepos?: Repo[];
}

export interface RankedLanguage extends LanguageTierBreakdown {
  sCount: number;
  aCount: number;
  bCount: number;
  cCount: number;
  dCount: number;
  grandTotal: number;
  sPct: number;
  aPct: number;
  bPct: number;
  cPct: number;
  dPct: number;
  score: number;
  welcomingTotal: number;
}

export type CategoryPreset = "hof" | "welcoming" | "giants" | "gfi" | "merge" | "firstTimer";

const NON_ECOSYSTEM_LANGUAGES = new Set([
  "yaml",
  "json",
  "markdown",
  "mdx",
  "mustache",
  "dockerfile",
  "makefile",
  "hcl",
  "cmake",
  "bitbake",
  "tex",
  "jinja",
  "starlark",
  "nunjucks",
  "go template",
  "html",
  "css",
  "jupyter notebook",
]);

const FALLBACK_BREAKDOWN: LanguageTierBreakdown[] = [
  { language: "Python", total: 245, tier_map: { S: 35, A: 85, B: 95, C: 30 } },
  { language: "TypeScript", total: 210, tier_map: { S: 28, A: 72, B: 80, C: 30 } },
  { language: "Go", total: 180, tier_map: { S: 25, A: 65, B: 60, C: 30 } },
  { language: "Rust", total: 140, tier_map: { S: 18, A: 42, B: 50, C: 30 } },
  { language: "Java", total: 120, tier_map: { S: 15, A: 35, B: 40, C: 30 } },
];

/** Formats median review wait; replaces the nested ternary in the telemetry grid. */
export function formatReviewTime(hours: number): string {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d+`;
}

function getStarBoundsFromBucket(bucket: string): { min?: string; max?: string } {
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
}

function getFirstTimerBoundsFromBucket(bucket: string): { min?: string; max?: string } {
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
}

function mapRepoResponse(r: Record<string, unknown>, fallbackTier: string): Repo {
  return {
    ...(r as unknown as Repo),
    c_rank_tier: (r.c_rank_tier as string) || (r.class_rank as string) || fallbackTier,
    class_rank: (r.class_rank as string) || (r.c_rank_tier as string) || fallbackTier,
    first_timer_success_rate:
      (r.first_timer_success_rate as number) !== undefined
        ? (r.first_timer_success_rate as number)
        : (r.first_timer_rate as number),
  };
}

/** All homepage data logic: repo/spotlight/stats fetching, filters, derived lists. */
export function useHomeData({ initialStats, initialRepos = [], initialSpotlightRepos = [] }: HomeDataProps) {
  const [repos, setRepos] = useState<Repo[]>(initialRepos);
  const [stats, setStats] = useState<MacroStats | null>(initialStats);
  const [spotlightRepos, setSpotlightRepos] = useState<Repo[]>(initialSpotlightRepos);
  const [selectedLang, setSelectedLang] = useState<string>("All");
  const [selectedBucket, setSelectedBucket] = useState<string>("All");
  const [selectedTier, setSelectedTier] = useState<string>("S");
  const [selectedMinMergeRate, setSelectedMinMergeRate] = useState<string>("All");
  const [selectedFirstTimerBucket, setSelectedFirstTimerBucket] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [trendingOnly, setTrendingOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(initialRepos.length === 0);
  const [page, setPage] = useState<number>(1);
  const perPage = 15;

  const [isLoggedIn] = useState<boolean>(() => {
    return typeof document !== "undefined" && document.cookie.includes("opendoor_token=");
  });

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

  const fetchRepos = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("per_page", perPage.toString());
    params.set("sort", "c_rank_score");
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
        let mappedList: Repo[] = rawList.map((r: Record<string, unknown>) => mapRepoResponse(r, "A"));

        if (selectedTier === "All") {
          mappedList = mappedList.filter(
            (r) => r.c_rank_tier !== "C" && r.c_rank_tier !== "D" && r.class_rank !== "C" && r.class_rank !== "D"
          );
        }

        setRepos(mappedList);
      }
    } catch (err) {
      console.error("Failed to fetch repos", err);
    } finally {
      setLoading(false);
    }
  }, [selectedLang, selectedBucket, selectedTier, selectedMinMergeRate, selectedFirstTimerBucket, trendingOnly, searchQuery, page]);

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialRepos.length > 0) {
        return;
      }
    }
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
  }, [fetchRepos, initialRepos.length]);

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem("opendoor_scroll_pos", window.scrollY.toString());
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (initialSpotlightRepos.length === 0) {
      fetch(
        `${API_BASE_URL}/api/v1/repos?scored_today=true&max_last_activity_days=7&exclude_stale=true&exclude_fallback=true&min_tier=B&min_stars=500&sort=c_rank_score&order=desc&per_page=30`
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const rawList = data?.data || data?.repos;
          if (Array.isArray(rawList) && rawList.length > 0) {
            const mapped: Repo[] = rawList.map((r: Record<string, unknown>) => mapRepoResponse(r, ""));

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
    }

    if (!initialStats) {
      fetch(`${API_BASE_URL}/api/v1/stats/macro`)
        .then((res) => res.json())
        .then((data) => {
          if (data.stats) setStats(data.stats);
        })
        .catch(() => {});
    }
  }, [initialSpotlightRepos.length, initialStats]);

  /** Memoized sorted/filtered repo lists for render. */
  const visibleRepos = useMemo(() => repos.slice(0, 6), [repos]);
  const spotlightVisible = useMemo(() => spotlightRepos.slice(0, 3), [spotlightRepos]);

  const rankedLanguages = useMemo<RankedLanguage[]>(() => {
    const source = stats?.language_breakdown ?? FALLBACK_BREAKDOWN;
    return source
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
        const welcomingTotal = item.welcoming_count ?? sCount + aCount;

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
      .filter(
        (item) =>
          item.grandTotal >= 50 &&
          item.sCount + item.aCount >= 10 &&
          !NON_ECOSYSTEM_LANGUAGES.has(item.language.trim().toLowerCase())
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [stats]);

  const applyCategoryPreset = useCallback((preset: CategoryPreset) => {
    setTrendingOnly(false);
    setSelectedBucket("All");
    setSelectedFirstTimerBucket("All");
    setSelectedMinMergeRate("All");
    setSelectedTier("All");
    if (preset === "hof") setSelectedTier("S");
    if (preset === "welcoming") setSelectedTier("A");
    if (preset === "giants") setSelectedBucket("50k+");
    if (preset === "gfi") setSelectedFirstTimerBucket("has_gfi");
    if (preset === "merge") setSelectedMinMergeRate("60%");
    if (preset === "firstTimer") setSelectedFirstTimerBucket("60-80%");
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedLang("All");
    setSelectedTier("All");
    setSelectedBucket("All");
    setSearchQuery("");
    setTrendingOnly(false);
    setPage(1);
    setLoading(true);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setLoading(true);
    setPage(1);
  }, []);

  const applyQuickSearch = useCallback((term: string) => {
    setSearchQuery(term);
    setLoading(true);
    setPage(1);
  }, []);

  return {
    repos,
    stats,
    visibleRepos,
    spotlightRepos,
    spotlightVisible,
    rankedLanguages,
    loading,
    setLoading,
    page,
    setPage,
    perPage,
    selectedLang,
    setSelectedLang,
    selectedBucket,
    selectedTier,
    selectedMinMergeRate,
    selectedFirstTimerBucket,
    searchQuery,
    setSearchQuery,
    trendingOnly,
    isLoggedIn,
    famousRepos,
    placeholderIndex,
    applyCategoryPreset,
    resetFilters,
    clearSearch,
    applyQuickSearch,
  };
}
