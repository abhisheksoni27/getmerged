"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Loader2,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import type { TopicStat } from "@/types/opendoor";

interface TopicDirectoryGridProps {
  initialTopics: string[];
  initialStats: TopicStat[];
  totalCount: number;
}

const PAGE_SIZE = 100;
const TRENDING_COUNT = 8;

function mergeRateLabel(rate: number): string {
  return rate > 0 ? `${rate.toFixed(1)}%` : "";
}

export function TopicDirectoryGrid({
  initialTopics,
  initialStats,
  totalCount,
}: TopicDirectoryGridProps) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [fullStats, setFullStats] = useState<TopicStat[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const effectiveTotal = Math.max(totalCount, initialTopics.length);

  const trendingTopics = useMemo(() => {
    const source = fullStats ?? initialStats;
    return [...source]
      .sort((a, b) => b.repo_count - a.repo_count)
      .slice(0, TRENDING_COUNT);
  }, [fullStats, initialStats]);

  const loadFullStats = async (): Promise<TopicStat[] | null> => {
    if (fullStats) return fullStats;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/topics`);
      if (res.ok) {
        const data = await res.json();
        const stats: TopicStat[] = data.topic_stats || [];
        setFullStats(stats);
        return stats;
      }
    } catch (err) {
      console.error("Failed to load full topic list:", err);
    }
    return fullStats;
  };

  const visibleStats = useMemo(() => {
    const source = fullStats ?? initialStats;
    if (!query.trim()) {
      return source.slice(0, visibleCount);
    }
    const q = query.trim().toLowerCase();
    return [...source]
      .filter((stat) => stat.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aExact = a.name === q ? 0 : 1;
        const bExact = b.name === q ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return b.repo_count - a.repo_count;
      });
  }, [fullStats, initialStats, query, visibleCount]);

  const isFiltering = query.trim().length > 0;
  const hasMore = !isFiltering && visibleCount < effectiveTotal;
  const remainingCount = effectiveTotal - visibleCount;

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim() && !fullStats) {
      loadFullStats();
    }
  };

  const handleShowMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const stats = fullStats ?? (await loadFullStats());
    if (stats) setFullStats(stats);
    setVisibleCount((count) => count + PAGE_SIZE);
    setLoadingMore(false);
  };

  return (
    <div>
      {!isFiltering && trendingTopics.length > 0 && (
        <section
          aria-label="Trending Topics"
          className="mb-6 p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs"
        >
          <h2 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Trending
            Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((stat) => (
              <Link
                key={stat.name}
                href={`/topics/${stat.name}`}
                title={`Explore #${stat.name} repositories and contributor metrics`}
                aria-label={`Explore trending topic #${stat.name}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 hover:bg-emerald-50 text-zinc-800 hover:text-emerald-800 border border-zinc-200/80 hover:border-emerald-300 font-sans text-xs font-semibold transition-all group"
              >
                #{stat.name}
                <span className="font-mono text-[10px] text-zinc-500 group-hover:text-emerald-700">
                  {stat.repo_count.toLocaleString()} repos
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="relative mb-6 max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Search topics..."
          aria-label="Search topics"
          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 font-sans text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-2xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <p
          className="mt-1.5 text-xs font-mono text-zinc-500 flex items-center justify-between"
          aria-live="polite"
        >
          {isFiltering
            ? `${visibleStats.length} topic${visibleStats.length === 1 ? "" : "s"} match "${query.trim()}"`
            : `Showing ${visibleCount.toLocaleString()} of ${effectiveTotal.toLocaleString()} topics`}
        </p>
      </div>

      {visibleStats.length > 0 ? (
        <div
          id="topics-grid"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {visibleStats.map((stat) => (
            <Link
              key={stat.name}
              href={`/topics/${stat.name}`}
              title={`Explore #${stat.name} repositories and contributor metrics`}
              aria-label={`Explore #${stat.name} topic`}
              className="group p-4 rounded-2xl border border-zinc-200/80 bg-white hover:border-emerald-500/80 hover:shadow-xs transition-all flex items-center justify-between min-w-0"
            >
              <span className="min-w-0">
                <span className="block font-space text-sm sm:text-base font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors truncate">
                  #{stat.name}
                </span>
                <span className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 group-hover:bg-emerald-50 group-hover:text-emerald-800 text-zinc-600 font-mono text-[11px] font-medium border border-zinc-200/60 transition-colors">
                    {stat.repo_count.toLocaleString()} repos
                  </span>
                  {mergeRateLabel(stat.avg_external_pr_merge_rate) && (
                    <span
                      className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[11px] font-medium border border-emerald-200/60"
                      title="Average external PR merge rate"
                    >
                      {mergeRateLabel(stat.avg_external_pr_merge_rate)} merge
                    </span>
                  )}
                </span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200/80 shadow-2xs my-6">
          <h3 className="font-space text-base font-bold text-zinc-900 mb-1">
            No topics match &quot;{query.trim()}&quot;
          </h3>
          <p className="text-xs text-zinc-500 font-sans mb-4">
            Try a different search term.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-sans text-sm font-medium hover:bg-zinc-50 active:scale-[0.98] transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 cursor-pointer"
          >
            Clear search
          </button>
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex flex-col items-center justify-center gap-2 pt-4">
          <button
            type="button"
            onClick={handleShowMore}
            disabled={loadingMore}
            aria-controls="topics-grid"
            aria-expanded={!hasMore}
            aria-label={`Show more topics, ${remainingCount.toLocaleString()} remaining`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-sans text-sm font-medium hover:bg-zinc-50 active:scale-[0.98] transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                Loading topics...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 text-zinc-500" />
                Show more topics ({remainingCount.toLocaleString()} remaining)
              </>
            )}
          </button>
          <span className="text-xs font-mono text-zinc-500">
            Showing {visibleCount.toLocaleString()} of{" "}
            {effectiveTotal.toLocaleString()} topics
          </span>
        </div>
      )}
    </div>
  );
}