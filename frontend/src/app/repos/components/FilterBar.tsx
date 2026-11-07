"use client";

import React from "react";
import { Search, X, Flame, RotateCcw } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";
import { LANGUAGES, STAR_BUCKETS, TIER_OPTIONS } from "./repoFilterOptions";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  selectedLang: string;
  onLangChange: (value: string) => void;
  selectedTier: string;
  onTierChange: (value: string) => void;
  selectedStarBucket: string;
  onStarBucketChange: (value: string) => void;
  trendingOnly: boolean;
  onTrendingToggle: () => void;
  activeFilterCount: number;
  onReset: () => void;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  selectedLang,
  onLangChange,
  selectedTier,
  onTierChange,
  selectedStarBucket,
  onStarBucketChange,
  trendingOnly,
  onTrendingToggle,
  activeFilterCount,
  onReset,
}: FilterBarProps) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 shadow-sm mb-10">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by repo name (e.g. facebook/react, fastapi)..."
            className="w-full pl-11 pr-10 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--border-strong)] transition-all font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              title="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Desktop Filters Row */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          {/* Language Select */}
          <select
            value={selectedLang}
            onChange={(e) => onLangChange(e.target.value)}
            aria-label="Filter by language"
            className="px-3.5 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium focus:border-[var(--border-strong)] cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                {l === "All" ? "All Languages" : l}
              </option>
            ))}
          </select>

          {/* Tier Select */}
          <select
            value={selectedTier}
            onChange={(e) => onTierChange(e.target.value)}
            aria-label="Filter by C-Rank tier"
            className="px-3.5 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium focus:border-[var(--border-strong)] cursor-pointer"
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                {t.label}
              </option>
            ))}
          </select>

          {/* Star Volume Select */}
          <select
            value={selectedStarBucket}
            onChange={(e) => onStarBucketChange(e.target.value)}
            aria-label="Filter by stars"
            className="px-3.5 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium focus:border-[var(--border-strong)] cursor-pointer"
          >
            {STAR_BUCKETS.map((b) => (
              <option key={b.value} value={b.value} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                {b.label}
              </option>
            ))}
          </select>

          {/* Trending Toggle Pill */}
          <button
            type="button"
            onClick={onTrendingToggle}
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border transition-all cursor-pointer font-bold ${
              trendingOnly
                ? "bg-[#C4910A] text-white border-[#C4910A] shadow-sm"
                : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Flame className={`h-4 w-4 ${trendingOnly ? "text-white fill-white" : "text-[var(--text-tertiary)]"}`} />
            <span>Trending</span>
          </button>

          {/* Reset button if filters active */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              title="Reset all filters"
              className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        </div>

        {/* Quick Language Chips Carousel */}
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[var(--text-tertiary)] font-mono shrink-0 pl-1">Quick:</span>
        {LANGUAGES.map((lang) => {
          const active = selectedLang === lang;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => onLangChange(lang)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer font-sans shrink-0 ${
                active
                  ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] font-bold shadow-sm"
                  : "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
              }`}
            >
              {lang !== "All" && <LangLogo language={lang} />}
              <span>{lang}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
