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
      <label className="block text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
        {slotLabel}
      </label>

      {hasSelected && selected ? (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://github.com/${selected.owner}.png?size=64`}
              alt={selected.owner}
              className="h-9 w-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] object-cover shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://github.com/github.png?size=64";
              }}
            />
            <div className="min-w-0">
              <div className="font-space text-sm font-bold text-[var(--text-primary)] truncate">
                {selected.full_name}
              </div>
              <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                {typeof selected.stars === "number" && (
                  <span className="flex items-center gap-1 font-semibold text-[var(--text-secondary)]">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    {formatStarCount(selected.stars)}
                  </span>
                )}
                <span>•</span>
                {selected.language && (
                  <>
                    <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                      <LangLogo language={selected.language} />
                      <span>{selected.language}</span>
                    </span>
                    <span>•</span>
                  </>
                )}
                <span className="font-bold text-[#0D9668]">
                  {selected.c_rank_tier || "A"} Tier
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${slotLabel}`}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
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
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-terracotta)]/40 ring-offset-1 transition-all"
            />
            {loading && (
              <Loader2 className="absolute right-3.5 h-4 w-4 animate-spin text-[var(--text-muted)]" />
            )}
          </div>

          {showDropdown && (
            <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-h-64 overflow-y-auto p-1.5">
              {hasResults ? (
                results.map((r) => (
                  <button
                    key={r.id || r.full_name}
                    type="button"
                    onClick={() => onSelect(r)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="font-space text-xs font-bold text-[var(--text-primary)] truncate">
                        {r.full_name}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1">
                        {r.description || "No description"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className="flex items-center gap-0.5 text-[var(--text-secondary)] font-semibold">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                        {formatStarCount(r.stars)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold">
                        {r.c_rank_tier || r.class_rank || "A"}
                      </span>
                    </div>
                  </button>
                ))
              ) : showEmptyState ? (
                <div className="p-3 text-center text-xs text-[var(--text-muted)] font-mono">
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
