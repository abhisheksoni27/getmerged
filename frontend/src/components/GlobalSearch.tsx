"use client";

import React, { useRef } from "react";
import { Search, X, Loader2, CornerDownLeft, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSearch } from "@/context/SearchContext";
import { FAMOUS_REPOS } from "@/lib/github-search";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { SearchResults } from "./search/SearchResults";
import { Repo } from "@/types/opendoor";
import posthog from "posthog-js";

export { parseGitHubInput } from "@/lib/github-search";

export function GlobalSearch() {
  const { isOpen, closeSearch, searchQuery, setSearchQuery } = useSearch();
  const router = useRouter();
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    results,
    setResults,
    loading,
    selectedIndex,
    selectedIndexRef,
    placeholderIndex,
    inputRef,
    modalRef,
    setSelectedIndex,
    handleKeyDown,
  } = useGlobalSearch({
    isOpen,
    searchQuery,
    onClose: closeSearch,
    onNavigate: (fullName) => router.push(`/${fullName}`),
  });

  const handleSelectRepo = (repo: Repo) => {
    posthog.capture("repo_clicked_from_search", { repo_full_name: repo.full_name });
    closeSearch();
  };

  const handlePickShortcut = (term: string) => {
    setSearchQuery(term);
    inputRef.current?.focus();
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
            <SearchResults
              results={results}
              selectedIndex={selectedIndex}
              selectedIndexRef={selectedIndexRef}
              searchQuery={searchQuery}
              loading={loading}
              containerRef={resultsContainerRef}
              onSelectRepo={handleSelectRepo}
              onHoverResult={setSelectedIndex}
              onPickShortcut={handlePickShortcut}
            />

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
