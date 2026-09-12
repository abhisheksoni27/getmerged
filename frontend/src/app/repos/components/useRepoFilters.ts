"use client";

import { useState, useMemo } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";

export interface RepoFilterState {
  searchQuery: string;
  selectedLang: string;
  selectedTier: string;
  selectedStarBucket: string;
  selectedMergeRate: string;
  selectedFirstTimer: string;
  trendingOnly: boolean;
  page: number;
}

export function applyStarBucketToParams(params: URLSearchParams, bucket: string) {
  if (bucket === "<5k") {
    params.set("max_stars", "5000");
  } else if (bucket === "5k-20k") {
    params.set("min_stars", "5000");
    params.set("max_stars", "20000");
  } else if (bucket === "20k-50k") {
    params.set("min_stars", "20000");
    params.set("max_stars", "50000");
  } else if (bucket === "50k+") {
    params.set("min_stars", "50000");
  }
}

export function buildRepoQueryParams(filters: RepoFilterState, page: number, perPage: number): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("per_page", perPage.toString());
  params.set("sort", "c_rank_score");
  params.set("order", "desc");

  if (filters.searchQuery.trim()) params.set("name", filters.searchQuery.trim());
  if (filters.selectedLang !== "All") params.set("language", filters.selectedLang);
  if (filters.selectedTier !== "All") params.set("tier", filters.selectedTier);
  if (filters.trendingOnly) params.set("trending", "true");

  applyStarBucketToParams(params, filters.selectedStarBucket);

  if (filters.selectedMergeRate !== "All") {
    params.set("min_merge_rate", filters.selectedMergeRate);
  }

  if (filters.selectedFirstTimer !== "All") {
    params.set("min_first_timer_success_rate", filters.selectedFirstTimer);
  }

  return params;
}

export function useRepoFilters(searchParams: ReadonlyURLSearchParams) {
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

  return {
    searchQuery,
    setSearchQuery,
    selectedLang,
    setSelectedLang,
    selectedTier,
    setSelectedTier,
    selectedStarBucket,
    setSelectedStarBucket,
    selectedMergeRate,
    setSelectedMergeRate,
    selectedFirstTimer,
    setSelectedFirstTimer,
    trendingOnly,
    setTrendingOnly,
    page,
    setPage,
    activeFilterCount,
    resetFilters,
  };
}
