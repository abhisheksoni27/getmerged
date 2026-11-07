"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  initialPage?: number;
}

const PAGE_SIZE = 100;
const TRENDING_COUNT = 8;

function mergeRateLabel(rate: number): string {
  return rate > 0 ? `${rate.toFixed(1)}%` : "";
}

function formatStars(stars?: number): string {
  if (!stars || stars < 1) return "";
  return stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : Math.round(stars).toString();
}

function formatResponseHours(hours?: number): string {
  if (!hours || hours <= 0) return "";
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export function TopicDirectoryGrid({
  initialTopics,
  initialStats,
  totalCount,
  initialPage = 1,
}: TopicDirectoryGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [visibleCount, setVisibleCount] = useState(() => Math.max(PAGE_SIZE, initialPage * PAGE_SIZE));
  const [fullStats, setFullStats] = useState<TopicStat[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const effectiveTotal = Math.max(totalCount, initialTopics.length);

  const trendingTopics = useMemo(() => {
    const source = fullStats ?? initialStats;
    return [...source]
      .sort((a, b) => b.repo_count - a.repo_count)
      .slice(0, TRENDING_COUNT);
  }, [fullStats, initialStats]);

  const loadFullStats = useCallback(async (): Promise<TopicStat[] | null> => {
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
  }, [fullStats]);

  // Sync if URL query param changes
  useEffect(() => {
    const urlPage = parseInt(searchParams.get("page") || "1", 10);
    if (!isNaN(urlPage) && urlPage > 1) {
      setVisibleCount((prev) => Math.max(prev, urlPage * PAGE_SIZE));
      if (!fullStats) {
        loadFullStats();
      }
    }
  }, [searchParams, fullStats, loadFullStats]);

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
    const nextCount = visibleCount + PAGE_SIZE;
    setVisibleCount(nextCount);
    const nextPage = Math.ceil(nextCount / PAGE_SIZE);

    // Dynamically update URL query param for SEO & canonical parity
    const currentParams = new URLSearchParams(searchParams.toString());
    if (nextPage > 1) {
      currentParams.set("page", nextPage.toString());
    } else {
      currentParams.delete("page");
    }
    const newUrl = `${pathname}?${currentParams.toString()}`;
    router.replace(newUrl, { scroll: false });

    setLoadingMore(false);
  };

  return (
    <div>
      {!isFiltering && trendingTopics.length > 0 && (
        <section
          aria-label="Trending Topics"
          className="mb-6 p-4 rounded-none glass-panel border border-[var(--border-subtle)] border-b shadow-sm"
        >
          <h2 className="text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Trending
            Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((stat) => (
              <Link prefetch={false}
                key={stat.name}
                href={`/topics/${stat.name}`}
                title={`Explore #${stat.name} repositories and contributor metrics`}
                aria-label={`Explore trending topic #${stat.name}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none glass-panel hover:bg-emerald-950/70 border-emerald-800/80 text-[var(--text-primary)] border border-[var(--border-subtle)] font-sans text-xs font-bold transition-colors group"
              >
                #{stat.name}
                <span className="font-mono text-[10px] text-[var(--text-secondary)] group-hover:text-emerald-300">
                  {stat.repo_count.toLocaleString()} repos
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 max-w-md w-full">
        {/* Inner relative wrapper spans ONLY the input row so the search icon
            stays vertically centered (fixes icon hanging below input). */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-primary)]">
            <Search className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Search topics..."
            aria-label="Search topics"
            className="w-full pl-10 pr-9 py-2.5 rounded-none border border-[var(--border-subtle)] glass-panel text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] font-sans font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-shadow shadow-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-none border border-[var(--border-subtle)] glass-panel text-[var(--text-secondary)] hover:glass-card transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p
          className="mt-1.5 text-xs font-mono text-[var(--text-secondary)] flex items-center justify-between"
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
          {visibleStats.map((stat) => {
            const starsLabel = formatStars(stat.avg_stars);
            const responseLabel = formatResponseHours(stat.avg_response_hours);
            return (
              <Link prefetch={false}
                key={stat.name}
                href={`/topics/${stat.name}`}
                title={`Explore #${stat.name} repositories and contributor metrics`}
                aria-label={`Explore #${stat.name} topic`}
                className="group p-4 rounded-none border border-[var(--border-subtle)] border-b glass-panel hover:bg-emerald-950/70 border-emerald-800/80 hover:-translate-y-0.5 transition-transform flex flex-col min-w-0"
              >
                <span className="flex items-start justify-between gap-2 min-w-0">
                  <span className="font-space text-sm sm:text-base font-extrabold text-[var(--text-primary)] truncate">
                    #{stat.name}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--text-secondary)] group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                </span>
                <span className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-none bg-black text-white font-mono text-[11px] font-bold">
                    {stat.repo_count.toLocaleString()} repos
                  </span>
                  {starsLabel && (
                    <span
                      className="px-2 py-0.5 rounded-none bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold border border-[var(--border-subtle)]"
                      title="Average stars per repository"
                    >
                      ★ {starsLabel}
                    </span>
                  )}
                  {mergeRateLabel(stat.avg_external_pr_merge_rate) && (
                    <span
                      className="px-2 py-0.5 rounded-none bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold border border-[var(--border-subtle)]"
                      title="Average external PR merge rate"
                    >
                      {mergeRateLabel(stat.avg_external_pr_merge_rate)} merge
                    </span>
                  )}
                  {responseLabel && (
                    <span
                      className="px-2 py-0.5 rounded-none glass-card text-[var(--text-secondary)] font-mono text-[11px] font-bold border border-[var(--border-subtle)]"
                      title="Median time to first review"
                    >
                      {responseLabel} first review
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center glass-panel rounded-none border border-[var(--border-subtle)] border-b shadow-sm my-6">
          <h3 className="font-space text-base font-bold text-[var(--text-primary)] mb-1">
            No topics match &quot;{query.trim()}&quot;
          </h3>
          <p className="text-xs text-[var(--text-secondary)] font-sans mb-4">
            Try a different search term.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-none border border-[var(--border-subtle)] border-b glass-panel text-[var(--text-primary)] font-sans text-sm font-bold hover:glass-card active:translate-y-0.5 active:border-b-2 transition-all focus:outline-none cursor-pointer"
          >
            Clear search
          </button>
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 pt-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleShowMore}
              disabled={loadingMore}
              aria-controls="topics-grid"
              aria-expanded={!hasMore}
              aria-label={`Show more topics, ${remainingCount.toLocaleString()} remaining`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-none border border-[var(--border-subtle)] border-b glass-panel text-[var(--text-primary)] font-sans text-sm font-bold hover:bg-emerald-950/70 border-emerald-800/80 active:translate-y-0.5 active:border-b-2 transition-all focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--text-secondary)]" />
                  Loading topics...
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
                  Show more topics ({remainingCount.toLocaleString()} remaining)
                </>
              )}
            </button>
            <Link prefetch={false}
              href={`/topics?page=${Math.min(Math.ceil(effectiveTotal / PAGE_SIZE), Math.ceil(visibleCount / PAGE_SIZE) + 1)}`}
              title={`Explore next page of repository topics (Page ${Math.ceil(visibleCount / PAGE_SIZE) + 1})`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-none border border-[var(--border-subtle)] border-b bg-amber-600 text-white font-mono text-xs font-bold hover:bg-amber-300 transition-all"
            >
              Next Page ({Math.ceil(visibleCount / PAGE_SIZE) + 1}) &rarr;
            </Link>
          </div>
          <span className="text-xs font-mono text-[var(--text-secondary)]">
            Showing {visibleCount.toLocaleString()} of{" "}
            {effectiveTotal.toLocaleString()} topics
          </span>
        </div>
      )}
    </div>
  );
}