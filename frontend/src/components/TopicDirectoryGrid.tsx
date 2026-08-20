"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface TopicDirectoryGridProps {
  initialTopics: string[];
  totalCount: number;
}

const PAGE_SIZE = 100;

export function TopicDirectoryGrid({
  initialTopics,
  totalCount,
}: TopicDirectoryGridProps) {
  const [topics, setTopics] = useState<string[]>(initialTopics);
  const [allTopicsCache, setAllTopicsCache] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveTotal = Math.max(totalCount, topics.length);
  const hasMore = topics.length < effectiveTotal;
  const remainingCount = effectiveTotal - topics.length;

  const handleShowMore = async () => {
    if (loading) return;

    if (allTopicsCache) {
      const nextBatch = allTopicsCache.slice(0, topics.length + PAGE_SIZE);
      setTopics(nextBatch);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/topics`);
      if (res.ok) {
        const data = await res.json();
        const fetchedList: string[] = data.topics || data.data || [];
        setAllTopicsCache(fetchedList);
        const nextBatch = fetchedList.slice(0, topics.length + PAGE_SIZE);
        setTopics(nextBatch);
      }
    } catch (err) {
      console.error("Failed to load more topics:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div
        id="topics-grid"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {topics.map((topic) => (
          <Link
            key={topic}
            href={`/topics/${topic}`}
            title={`Explore #${topic} repositories and contributor metrics`}
            aria-label={`Explore #${topic} topic`}
            className="group p-4 rounded-2xl border border-zinc-200/80 bg-white hover:border-emerald-500/80 hover:shadow-xs transition-all flex items-center justify-between min-w-0"
          >
            <span className="font-space text-sm sm:text-base font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors truncate">
              #{topic}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex flex-col items-center justify-center gap-2 pt-4">
          <button
            type="button"
            onClick={handleShowMore}
            disabled={loading}
            aria-controls="topics-grid"
            aria-expanded={!hasMore}
            aria-label={`Show more topics, ${remainingCount} remaining`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-sans text-sm font-medium hover:bg-zinc-50 active:scale-[0.98] transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
          >
            {loading ? (
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
            Showing {topics.length.toLocaleString()} of{" "}
            {effectiveTotal.toLocaleString()} topics
          </span>
        </div>
      )}
    </div>
  );
}
