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
    <section className="rounded-none border-2 border-black bg-white p-5 sm:p-6 shadow-[4px_4px_0px_0px_#000] mb-8">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by repo name (e.g. facebook/react, fastapi)..."
            className="w-full pl-11 pr-10 py-3 rounded-none bg-[#FFFDF8] border-2 border-black text-xs font-mono text-black placeholder:text-neutral-500 focus:outline-none focus:bg-white shadow-[2px_2px_0px_0px_#000]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              title="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-black hover:bg-[#EF4444] hover:text-white border border-black cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
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
            className="px-3.5 py-3 rounded-none bg-[#FFFDF8] border-2 border-black text-black font-mono font-bold shadow-[2px_2px_0px_0px_#000] cursor-pointer focus:outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l} className="bg-white text-black font-mono">
                {l === "All" ? "ALL LANGUAGES" : l.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Tier Select */}
          <select
            value={selectedTier}
            onChange={(e) => onTierChange(e.target.value)}
            aria-label="Filter by C-Rank tier"
            className="px-3.5 py-3 rounded-none bg-[#FFFDF8] border-2 border-black text-black font-mono font-bold shadow-[2px_2px_0px_0px_#000] cursor-pointer focus:outline-none"
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value} className="bg-white text-black font-mono">
                {t.label.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Star Volume Select */}
          <select
            value={selectedStarBucket}
            onChange={(e) => onStarBucketChange(e.target.value)}
            aria-label="Filter by stars"
            className="px-3.5 py-3 rounded-none bg-[#FFFDF8] border-2 border-black text-black font-mono font-bold shadow-[2px_2px_0px_0px_#000] cursor-pointer focus:outline-none"
          >
            {STAR_BUCKETS.map((b) => (
              <option key={b.value} value={b.value} className="bg-white text-black font-mono">
                {b.label.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Trending Toggle Pill */}
          <button
            type="button"
            onClick={onTrendingToggle}
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-none border-2 border-black font-mono uppercase transition-all cursor-pointer font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
              trendingOnly
                ? "bg-[#FACC15] text-black"
                : "bg-[#FFFDF8] text-black hover:bg-[#F4F4EE]"
            }`}
          >
            <Flame className={`h-4 w-4 ${trendingOnly ? "text-black fill-black" : "text-black"}`} />
            <span>Trending</span>
          </button>

          {/* Reset button if filters active */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              title="Reset all filters"
              className="p-3 rounded-none border-2 border-black bg-[#EF4444] text-white hover:bg-black font-mono font-bold shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Language Chips Carousel */}
      <div className="mt-4 pt-4 border-t-2 border-black flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-black font-mono font-black uppercase shrink-0 pl-1">QUICK:</span>
        {LANGUAGES.map((lang) => {
          const active = selectedLang === lang;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => onLangChange(lang)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs uppercase whitespace-nowrap transition-all cursor-pointer font-mono font-bold shrink-0 border-2 border-black ${
                active
                  ? "bg-black text-[#FACC15] shadow-none translate-x-0.5 translate-y-0.5"
                  : "bg-[#FFFDF8] text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#F4F4EE]"
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
