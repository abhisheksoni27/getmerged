"use client";

import React, { RefObject } from "react";
import { Repo } from "@/types/opendoor";
import { SearchRow } from "./SearchRow";
import { FamousRepos } from "./FamousRepos";

interface SearchResultsProps {
  results: Repo[];
  selectedIndex: number;
  selectedIndexRef: RefObject<number>;
  searchQuery: string;
  loading: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  onSelectRepo: (repo: Repo) => void;
  onHoverResult: (index: number) => void;
  onPickShortcut: (term: string) => void;
}

export function SearchResults({
  results,
  selectedIndex,
  selectedIndexRef,
  searchQuery,
  loading,
  containerRef,
  onSelectRepo,
  onHoverResult,
  onPickShortcut,
}: SearchResultsProps) {
  return (
    <div
      ref={containerRef}
      id="search-results-list"
      role="listbox"
      aria-label="Search results"
      className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.04] p-1.5"
    >
      {results.length > 0 ? (
        results.map((repo, idx) => (
          <SearchRow
            key={repo.id || repo.full_name}
            kind="repo"
            repo={repo}
            index={idx}
            rowId={`search-result-${repo.id || repo.full_name}`}
            isSelected={selectedIndex === idx}
            onHover={(i) => {
              selectedIndexRef.current = i;
              onHoverResult(i);
            }}
            onSelect={onSelectRepo}
          />
        ))
      ) : searchQuery.trim() && !loading ? (
        <div className="px-4 py-8 text-center text-xs text-zinc-300 font-mono">
          No indexed repositories matching &ldquo;{searchQuery}&rdquo;.
          <div className="mt-2 text-zinc-300 font-sans">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px]">
              Enter
            </kbd>{" "}
            to run an instant scan on GitHub.
          </div>
        </div>
      ) : !searchQuery.trim() ? (
        <FamousRepos onPick={onPickShortcut} />
      ) : null}
    </div>
  );
}
