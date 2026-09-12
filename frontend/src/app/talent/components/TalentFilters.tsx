"use client";

import { Search } from "lucide-react";
import { TALENT_LANGUAGES } from "./useTalentFilters";

interface TalentFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  selectedLang: string;
  onLangChange: (lang: string) => void;
  selectedMinKarma: number;
  onMinKarmaChange: (value: number) => void;
  openToWorkOnly: boolean;
  onOpenToWorkChange: (value: boolean) => void;
}

export function TalentFilters({
  searchQuery,
  onSearchChange,
  onClearSearch,
  selectedLang,
  onLangChange,
  selectedMinKarma,
  onMinKarmaChange,
  openToWorkOnly,
  onOpenToWorkChange,
}: TalentFiltersProps) {
  return (
    <div className="p-5 rounded-2xl glass-panel border border-white/[0.1] bg-[#121214]/90 space-y-4">
      {/* Main Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by repo (e.g. 'kubernetes', 'next.js'), skill, or candidate username..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0a0a0c] border border-white/[0.1] text-white text-sm font-sans placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={onClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white px-2 py-1 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Parametric Filters Grid */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
        {/* Language Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-zinc-400 mr-1">Ecosystem:</span>
          {TALENT_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => onLangChange(lang)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                selectedLang === lang
                  ? "bg-blue-600 text-white shadow-sm"
                  : "glass-card text-zinc-400 hover:text-white"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Minimum Karma & Open to Work Toggles */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Karma Filter */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-400">Min Karma:</span>
            <select
              value={selectedMinKarma}
              onChange={(e) => onMinKarmaChange(Number(e.target.value))}
              className="bg-[#0a0a0c] border border-white/[0.12] rounded-lg px-2.5 py-1 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
            >
              <option value={0}>All Levels</option>
              <option value={1500}>Level 4+ (Top 5% Senior)</option>
              <option value={3500}>Level 5 (Top 1% Legend)</option>
            </select>
          </div>

          {/* Open to Work Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-zinc-300">
            <input
              type="checkbox"
              checked={openToWorkOnly}
              onChange={(e) => onOpenToWorkChange(e.target.checked)}
              className="rounded border-white/20 bg-zinc-900 text-blue-600 focus:ring-0"
            />
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Actively Open to Work
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
