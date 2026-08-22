"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search, X, Loader2, CornerDownLeft, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSearch } from "@/context/SearchContext";
import { API_BASE_URL } from "@/lib/api";
import { Repo } from "@/types/opendoor";
import posthog from "posthog-js";

const FAMOUS_REPOS = [
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
];

export function GlobalSearch() {
  const { isOpen, closeSearch, searchQuery, setSearchQuery } = useSearch();
  const [results, setResults] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const selectedIndexRef = useRef<number>(-1);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // Cycling placeholder text
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % FAMOUS_REPOS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Fetch search results from API
  const fetchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      selectedIndexRef.current = -1;
      setSelectedIndex(-1);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(query.trim())}&per_page=10`);
      if (!res.ok) throw new Error("Search request failed");
      const data = await res.json();
      const rawList = data.data || data.repos;

      if (Array.isArray(rawList)) {
        const mappedList: Repo[] = rawList.map((r: Record<string, unknown>) => ({
          ...(r as unknown as Repo),
          c_rank_tier: (r.c_rank_tier as string) || (r.class_rank as string) || "A",
          class_rank: (r.class_rank as string) || (r.c_rank_tier as string) || "A",
          first_timer_success_rate:
            (r.first_timer_success_rate as number) !== undefined
              ? (r.first_timer_success_rate as number)
              : (r.first_timer_rate as number),
        }));
        setResults(mappedList);
        setSelectedIndex(selectedIndexRef.current);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Failed to search repos", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger search on query change
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      fetchResults(searchQuery);
      if (searchQuery.trim()) {
        posthog.capture("repo_searched", { query: searchQuery.trim(), source: "global_search" });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, fetchResults]);

  // Autofocus input and reset selection when modal opens; clean up on close
  useEffect(() => {
    if (isOpen) {
      selectedIndexRef.current = -1;
      setSelectedIndex(-1);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
      selectedIndexRef.current = -1;
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Handle keyboard navigation within modal (Tab trap, Arrow keys, Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length > 0) {
        const next = selectedIndexRef.current < results.length - 1 ? selectedIndexRef.current + 1 : 0;
        selectedIndexRef.current = next;
        setSelectedIndex(next);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) {
        const prev = selectedIndexRef.current > 0 ? selectedIndexRef.current - 1 : results.length - 1;
        selectedIndexRef.current = prev;
        setSelectedIndex(prev);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const currIndex = selectedIndexRef.current;
      const targetRepo =
        currIndex >= 0 && currIndex < results.length
          ? results[currIndex]
          : results.length > 0
          ? results[0]
          : null;
      if (targetRepo) {
        closeSearch();
        router.push(`/${targetRepo.full_name}`);
      }
    } else if (e.key === "Tab") {
      // Focus trapping
      if (!modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-zinc-950/40 backdrop-blur-sm"
          onClick={closeSearch}
        >
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Search repositories"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="nb-opt-out w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col focus:outline-none"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Search Input Header */}
            <div className="relative flex items-center border-b border-zinc-100 bg-zinc-50/50 p-4">
              <Search className="absolute left-5 h-5 w-5 text-zinc-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder={`Search repositories by name, e.g. ${FAMOUS_REPOS[placeholderIndex]}`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  selectedIndexRef.current = -1;
                  setSelectedIndex(-1);
                }}
                className="w-full pl-10 pr-24 py-1.5 text-base font-sans text-zinc-900 placeholder-zinc-400 focus:outline-none bg-transparent"
                autoFocus
              />
              <div className="absolute right-4 flex items-center gap-2">
                {loading && <Loader2 className="h-4 w-4 text-zinc-400 animate-spin mr-1" />}
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-500 shadow-2xs">
                  ESC
                </kbd>
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Close search"
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Results Container */}
            <div
              ref={resultsContainerRef}
              data-testid="global-search-results"
              className="max-h-96 overflow-y-auto p-3 space-y-1 font-sans divide-y divide-zinc-100"
            >
              {results.length > 0 ? (
                results.slice(0, 8).map((r, index) => {
                  const rankTier = r.class_rank || r.c_rank_tier || "A";
                  const isSelected = index === selectedIndex;
                  return (
                    <Link
                      key={r.id || r.full_name}
                      href={`/${r.full_name}`}
                      onClick={closeSearch}
                      title={`View ${r.full_name} C-Rank scorecard, PR response time & merge metrics`}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all group cursor-pointer block no-underline text-current pt-3 ${
                        isSelected ? "bg-zinc-100 ring-1 ring-zinc-300 font-medium" : "hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://github.com/${r.full_name?.split("/")[0]}.png?size=64`}
                          alt={r.full_name}
                          className="h-8 w-8 rounded-lg border border-zinc-200 bg-white shrink-0 object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png?size=64";
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
                          {r.language || "Other"}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold font-mono border-2 border-black rounded-lg shadow-[1px_1px_0px_#000] text-black ${
                            rankTier === "S"
                              ? "bg-[#8ce99a]"
                              : rankTier === "A"
                              ? "bg-[#bfdbff]"
                              : rankTier === "B"
                              ? "bg-[#ffd93d]"
                              : rankTier === "C"
                              ? "bg-[#e5dbff]"
                              : "bg-[#ffb3c7]"
                          }`}
                        >
                          {rankTier} Rank
                        </span>
                        {isSelected && (
                          <CornerDownLeft className="h-3.5 w-3.5 text-zinc-400 hidden sm:block" />
                        )}
                      </div>
                    </Link>
                  );
                })
              ) : searchQuery.trim() ? (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                  {loading ? "Searching repositories..." : `No repositories found matching "${searchQuery}".`}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-400 font-sans">
                  Type a repository name to search live rankings, or press <kbd className="font-mono bg-zinc-100 px-1 py-0.5 rounded border border-zinc-200 text-zinc-600">ESC</kbd> to exit.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" /> Navigate
                </span>
                <span>
                  Press <kbd className="bg-zinc-200 px-1 py-0.5 rounded text-zinc-700 font-medium">ESC</kbd> to close
                </span>
              </div>
              <Link
                href="/repos"
                onClick={closeSearch}
                className="text-zinc-900 font-semibold hover:underline cursor-pointer font-sans"
              >
                View all explorer results →
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
