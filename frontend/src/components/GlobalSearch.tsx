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

export function parseGitHubInput(input: string): string {
  const trimmed = input.trim();
  const ghMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i);
  if (ghMatch) {
    const owner = ghMatch[1];
    const name = ghMatch[2].replace(/\.git$/i, "").replace(/\/.*$/, "");
    return `${owner}/${name}`;
  }
  return trimmed;
}

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
    const parsed = parseGitHubInput(query);
    if (!parsed) {
      setResults([]);
      selectedIndexRef.current = -1;
      setSelectedIndex(-1);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(parsed)}&per_page=10`);
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
      } else {
        const parsed = parseGitHubInput(searchQuery);
        if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(parsed)) {
          closeSearch();
          router.push(`/${parsed}`);
        }
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
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-md"
          onClick={closeSearch}
          role="dialog"
          aria-modal="true"
          aria-label="Search repositories"
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-2xl rounded-2xl border border-white/[0.12] bg-[#111111]/95 shadow-[0_24px_60px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] gap-3">
              <Search className="h-5 w-5 text-zinc-300 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search or paste GitHub URL (e.g. ${FAMOUS_REPOS[placeholderIndex]})`}
                className="w-full bg-transparent text-sm text-white placeholder-zinc-300 focus:outline-none font-sans"
                aria-autocomplete="list"
                aria-controls="search-results-list"
                aria-activedescendant={
                  selectedIndex >= 0 && results[selectedIndex]
                    ? `search-result-${results[selectedIndex].id || results[selectedIndex].full_name}`
                    : undefined
                }
              />
              {loading && <Loader2 className="h-4 w-4 text-zinc-300 animate-spin shrink-0" />}
              {searchQuery && !loading && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setResults([]);
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search query"
                  className="text-zinc-300 hover:text-white transition-colors cursor-pointer p-0.5 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-300">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div
              ref={resultsContainerRef}
              id="search-results-list"
              role="listbox"
              aria-label="Search results"
              className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.04] p-1.5"
            >
              {results.length > 0 ? (
                results.map((repo, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <Link
                      key={repo.id || repo.full_name}
                      id={`search-result-${repo.id || repo.full_name}`}
                      role="option"
                      aria-selected={isSelected}
                      href={`/${repo.full_name}`}
                      onClick={() => {
                        posthog.capture("repo_clicked_from_search", { repo_full_name: repo.full_name });
                        closeSearch();
                      }}
                      onMouseEnter={() => {
                        selectedIndexRef.current = idx;
                        setSelectedIndex(idx);
                      }}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                        isSelected
                          ? "bg-white/[0.08] text-white"
                          : "hover:bg-white/[0.04] text-zinc-300"
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="text-sm font-semibold font-mono text-white truncate">
                          {repo.full_name}
                        </span>
                        {repo.description && (
                          <span className="text-xs text-zinc-300 font-sans truncate mt-0.5 max-w-md">
                            {repo.description}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {repo.language && (
                          <span className="text-[11px] font-mono text-zinc-300 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                            {repo.language}
                          </span>
                        )}
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            repo.c_rank_tier === "S"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : repo.c_rank_tier === "A"
                              ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                              : repo.c_rank_tier === "B"
                              ? "bg-violet-500/15 text-violet-400 border border-violet-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {repo.c_rank_tier || "A"}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : searchQuery.trim() && !loading ? (
                <div className="px-4 py-8 text-center text-xs text-zinc-300 font-mono">
                  No indexed repositories matching &ldquo;{searchQuery}&rdquo;.
                  <div className="mt-2 text-zinc-300 font-sans">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px]">Enter</kbd> to run an instant scan on GitHub.
                  </div>
                </div>
              ) : !searchQuery.trim() ? (
                <div className="p-3">
                  <div className="text-[11px] font-mono font-semibold text-zinc-300 px-2 pb-2">
                    Popular Repositories
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-2">
                    {FAMOUS_REPOS.slice(0, 6).map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setSearchQuery(term);
                          inputRef.current?.focus();
                        }}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/[0.08] cursor-pointer transition-all"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] bg-black/40 text-[11px] font-mono text-zinc-300">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" /> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" /> Select
                </span>
              </div>
              <span>GetMerged Telemetry Index</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
