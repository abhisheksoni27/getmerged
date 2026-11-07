"use client";

import React, { useRef, useEffect } from "react";
import {
  Bookmark,
  GitPullRequest,
  Star,
} from "lucide-react";
import { Repo } from "@/types/opendoor";

export interface RepoSectionTab {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface RepoStickyBarProps {
  fullName: string;
  repo: Repo | null;
  rank: string;
  rankLabel: string;
  isWatching: boolean;
  watchLoading: boolean;
  onWatchToggle: () => void;
  activeSection: string;
  onSectionClick: (id: string) => void;
  tabs: RepoSectionTab[];
  visible: boolean;
}

export function RepoStickyBar({
  fullName,
  repo,
  rank,
  rankLabel,
  isWatching,
  watchLoading,
  onWatchToggle,
  activeSection,
  onSectionClick,
  tabs,
  visible,
}: RepoStickyBarProps) {
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const owner = repo?.owner || fullName.split("/")[0];
  const ownerAvatarUrl = `https://github.com/${owner}.png?size=64`;

  // Auto-scroll the active chip into view in the horizontal scroll container
  useEffect(() => {
    if (!tabsScrollRef.current) return;
    const activeEl = tabsScrollRef.current.querySelector(`[data-section-tab="${activeSection}"]`) as HTMLElement;
    if (activeEl) {
      const container = tabsScrollRef.current;
      const scrollLeft = activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [activeSection]);

  const getRankBadgeClasses = (r: string) => {
    switch (r?.toUpperCase()) {
      case "S":
        return "bg-emerald-50 text-[#0D9668] border-emerald-200";
      case "A":
        return "bg-sky-50 text-[#2D8ABF] border-sky-200";
      case "B":
        return "bg-purple-50 text-[#8B6BB5] border-purple-200";
      case "C":
        return "bg-amber-50 text-[#C4910A] border-amber-200";
      case "D":
        return "bg-rose-50 text-[#C4463A] border-rose-200";
      default:
        return "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]";
    }
  };

  return (
    <div
      className={`fixed top-16 left-0 right-0 z-40 w-full bg-[var(--bg-canvas)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] shadow-sm transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
    >
      <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-2">
        {/* Row 1: Repo identity, rank, stars on the left; Watch and GitHub on the right */}
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ownerAvatarUrl}
              alt={owner}
              width={26}
              height={26}
              className="w-6.5 h-6.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] object-cover shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png?size=64";
              }}
            />
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-space font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-[360px]">
                {fullName}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[11px] font-bold rounded-md border ${getRankBadgeClasses(
                  rank
                )}`}
              >
                <span>{rank}</span>
                <span>•</span>
                <span className="font-sans font-semibold">{rankLabel}</span>
              </span>
              {typeof repo?.stars === "number" && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[var(--text-secondary)]">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                  {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
                </span>
              )}
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onWatchToggle}
              disabled={watchLoading}
              title={isWatching ? "Watching repository" : "Watch repository"}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border border-[var(--border-subtle)] cursor-pointer ${
                isWatching
                  ? "bg-amber-50 border border-amber-200 text-[#C4910A] hover:bg-amber-100"
                  : "bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)]"
              }`}
            >
              <Bookmark className={`h-3 w-3 ${isWatching ? "fill-amber-500 text-amber-600" : "text-[var(--text-muted)]"}`} />
              <span className="hidden sm:inline">{isWatching ? "Watching" : "Watch"}</span>
            </button>
            <a
              href={`https://github.com/${fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`View ${fullName} on GitHub`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[var(--text-primary)] text-white hover:bg-[var(--text-primary)]/90 transition-colors border border-[var(--text-primary)]"
            >
              <GitPullRequest className="h-3 w-3" />
              <span>GitHub</span>
            </a>
          </div>
        </div>

        {/* Row 2: Full horizontal navbar of section tabs */}
        <div
          ref={tabsScrollRef}
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 min-w-0"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-section-tab={tab.id}
                onClick={() => onSectionClick(tab.id)}
                title={`Jump to ${tab.label}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-orange-50 text-[var(--brand-terracotta)] font-bold border border-orange-200 shadow-xs"
                    : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] font-medium"
                }`}
              >
                <Icon className={`h-3 w-3 ${isActive ? "text-[var(--brand-terracotta)] font-bold" : "text-[var(--text-muted)]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
