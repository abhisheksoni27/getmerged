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
    <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs mb-8">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by repo name (e.g. facebook/react, fastapi)..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50/80 border border-zinc-200 text-sm font-sans text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-400 transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              title="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"
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
            className="px-3.5 py-2.5 rounded-xl bg-zinc-50/80 border border-zinc-200 text-zinc-700 font-sans font-medium cursor-pointer focus:outline-none hover:bg-zinc-100 hover:border-zinc-300 transition-colors"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l} className="bg-white text-zinc-900">
                {l === "All" ? "All Languages" : l}
              </option>
            ))}
          </select>

          {/* Tier Select */}
          <select
            value={selectedTier}
            onChange={(e) => onTierChange(e.target.value)}
            aria-label="Filter by C-Rank tier"
            className="px-3.5 py-2.5 rounded-xl bg-zinc-50/80 border border-zinc-200 text-zinc-700 font-sans font-medium cursor-pointer focus:outline-none hover:bg-zinc-100 hover:border-zinc-300 transition-colors"
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value} className="bg-white text-zinc-900">
                {t.label}
              </option>
            ))}
          </select>

          {/* Star Volume Select */}
          <select
            value={selectedStarBucket}
            onChange={(e) => onStarBucketChange(e.target.value)}
            aria-label="Filter by stars"
            className="px-3.5 py-2.5 rounded-xl bg-zinc-50/80 border border-zinc-200 text-zinc-700 font-sans font-medium cursor-pointer focus:outline-none hover:bg-zinc-100 hover:border-zinc-300 transition-colors"
          >
            {STAR_BUCKETS.map((b) => (
              <option key={b.value} value={b.value} className="bg-white text-zinc-900">
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
                ? "bg-amber-50 text-amber-800 border-amber-200 shadow-2xs"
                : "bg-zinc-50 text-zinc-600 border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            <Flame className={`h-3.5 w-3.5 ${trendingOnly ? "text-amber-500 fill-amber-400" : "text-zinc-400"}`} />
            <span>Trending</span>
          </button>

          {/* Reset button if filters active */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              title="Reset all filters"
              className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Language Chips Carousel */}
      <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-zinc-400 font-mono text-xs uppercase tracking-wider shrink-0 pr-1">Quick:</span>
        {LANGUAGES.map((lang) => {
          const active = selectedLang === lang;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => onLangChange(lang)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer font-sans font-medium shrink-0 border ${
                active
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-900 hover:border-zinc-300"
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
