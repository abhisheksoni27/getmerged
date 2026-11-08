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
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[rgba(17,24,39,0.7)] p-5 sm:p-6 shadow-xs mb-8 backdrop-blur-md">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by repo name (e.g. facebook/react, fastapi)..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0B0F17] border border-[var(--border-subtle)] text-sm font-sans text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              title="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Desktop Filters Row */}
        <div className="hidden lg:flex items-center gap-2.5 text-xs">
          {/* Language Select */}
          <select
            value={selectedLang}
            onChange={(e) => onLangChange(e.target.value)}
            aria-label="Filter by language"
            className="px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-sans font-medium cursor-pointer focus:outline-none hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l} className="bg-[#0D111A] text-[var(--text-primary)]">
                {l === "All" ? "All Languages" : l}
              </option>
            ))}
          </select>

          {/* Tier Select */}
          <select
            value={selectedTier}
            onChange={(e) => onTierChange(e.target.value)}
            aria-label="Filter by C-Rank tier"
            className="px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-sans font-medium cursor-pointer focus:outline-none hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#0D111A] text-[var(--text-primary)]">
                {t.label}
              </option>
            ))}
          </select>

          {/* Star Volume Select */}
          <select
            value={selectedStarBucket}
            onChange={(e) => onStarBucketChange(e.target.value)}
            aria-label="Filter by stars"
            className="px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-sans font-medium cursor-pointer focus:outline-none hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            {STAR_BUCKETS.map((b) => (
              <option key={b.value} value={b.value} className="bg-[#0D111A] text-[var(--text-primary)]">
                {b.label}
              </option>
            ))}
          </select>

          {/* Trending Toggle Pill */}
          <button
            type="button"
            onClick={onTrendingToggle}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-sans transition-colors cursor-pointer font-medium ${
              trendingOnly
                ? "bg-[rgba(245,158,11,0.15)] text-amber-300 border-amber-500/40 shadow-xs"
                : "bg-[#0D111A] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Flame className={`h-3.5 w-3.5 ${trendingOnly ? "text-amber-400 fill-amber-400" : "text-[var(--text-tertiary)]"}`} />
            <span>Trending</span>
          </button>

          {/* Reset button if filters active */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              title="Reset all filters"
              className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[#0D111A] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Language Chips Carousel */}
      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[var(--text-tertiary)] font-mono text-xs uppercase tracking-wider shrink-0 pr-1">Quick:</span>
        {LANGUAGES.map((lang) => {
          const active = selectedLang === lang;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => onLangChange(lang)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer font-sans font-medium shrink-0 border ${
                active
                  ? "bg-[rgba(163,113,247,0.2)] text-white border-[var(--purple-bright)] font-semibold shadow-xs"
                  : "bg-[#0D111A] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
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
