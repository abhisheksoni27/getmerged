"use client";

import React, { RefObject } from "react";
import { LangLogo } from "@/components/LangLogo";
import { Repo } from "@/types/opendoor";
import { Search, Star, X, Loader2 } from "lucide-react";
import { SelectedRepo, formatStarCount } from "./compareTypes";

interface RepoSlotPickerProps {
  slotLabel: string;
  testId: string;
  placeholder: string;
  selected: SelectedRepo | null;
  query: string;
  results: Repo[];
  loading: boolean;
  dropdownOpen: boolean;
  dropdownRef: RefObject<HTMLDivElement | null>;
  onQueryChange: (value: string) => void;
  onDropdownOpen: () => void;
  onSelect: (repo: Repo) => void;
  onClear: () => void;
}

export function RepoSlotPicker({
  slotLabel,
  testId,
  placeholder,
  selected,
  query,
  results,
  loading,
  dropdownOpen,
  dropdownRef,
  onQueryChange,
  onDropdownOpen,
  onSelect,
  onClear,
}: RepoSlotPickerProps) {
  const hasSelected = selected !== null;
  const showDropdown = dropdownOpen && query.trim().length > 0;
  const hasResults = results.length > 0;
  const showEmptyState = !hasResults && !loading;

  return (
    <div className="w-full flex-1" ref={dropdownRef}>
      <label className="block text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-2">
        {slotLabel}
      </label>

      {hasSelected && selected ? (
        <div className="flex items-center justify-between p-3.5 rounded-2xl glass-card border border-white/[0.1] shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://github.com/${selected.owner}.png?size=64`}
              alt={selected.owner}
              className="h-9 w-9 rounded-xl border border-white/[0.1] glass-panel object-cover shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://github.com/github.png?size=64";
              }}
            />
            <div className="min-w-0">
              <div className="font-space text-sm font-bold text-white truncate">
                {selected.full_name}
              </div>
              <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-zinc-300">
                {typeof selected.stars === "number" && (
                  <span className="flex items-center gap-1 font-semibold text-zinc-300">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    {formatStarCount(selected.stars)}
                  </span>
                )}
                <span>•</span>
                {selected.language && (
                  <>
                    <span className="flex items-center gap-1 text-zinc-300">
                      <LangLogo language={selected.language} />
                      <span>{selected.language}</span>
                    </span>
                    <span>•</span>
                  </>
                )}
                <span className="font-bold text-emerald-400">
                  {selected.c_rank_tier || "A"} Tier
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${slotLabel}`}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-300 hover:bg-zinc-200/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-zinc-300 pointer-events-none" />
            <input
              type="text"
              data-testid={testId}
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                onQueryChange(e.target.value);
                onDropdownOpen();
              }}
              onFocus={onDropdownOpen}
              className="w-full pl-10 pr-10 py-3 rounded-2xl glass-panel border border-white/[0.1] text-sm text-white placeholder:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ring-offset-1 transition-all"
            />
            {loading && (
              <Loader2 className="absolute right-3.5 h-4 w-4 animate-spin text-zinc-300" />
            )}
          </div>

          {showDropdown && (
            <div className="absolute z-20 top-full left-0 right-0 mt-2 glass-panel border border-white/[0.1] rounded-2xl shadow-lg max-h-64 overflow-y-auto p-1.5">
              {hasResults ? (
                results.map((r) => (
                  <button
                    key={r.id || r.full_name}
                    type="button"
                    onClick={() => onSelect(r)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-emerald-950/70 border-emerald-800/80/70 hover:text-zinc-300 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="font-space text-xs font-bold text-white truncate">
                        {r.full_name}
                      </div>
                      <div className="text-[11px] text-zinc-300 line-clamp-1">
                        {r.description || "No description"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className="flex items-center gap-0.5 text-zinc-300 font-semibold">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                        {formatStarCount(r.stars)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded glass-card text-zinc-300 font-bold">
                        {r.c_rank_tier || r.class_rank || "A"}
                      </span>
                    </div>
                  </button>
                ))
              ) : showEmptyState ? (
                <div className="p-3 text-center text-xs text-zinc-300 font-mono">
                  No repositories found for &ldquo;{query}&rdquo;
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
