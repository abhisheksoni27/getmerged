"use client";

import React, { useRef, useEffect } from "react";
import {
  Bookmark,
  ExternalLink,
  Star,
} from "lucide-react";
import { Repo } from "@/types/opendoor";
import {
  formatBadgeLatency,
  getPositiveResponseHours,
} from "@/lib/format-latency";

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
  isWatching,
  watchLoading,
  onWatchToggle,
  activeSection,
  onSectionClick,
  tabs,
  visible,
}: RepoStickyBarProps) {
  const tabsScrollRef = useRef<HTMLDivElement>(null);

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

  const mergeRateStr = repo?.external_pr_merge_rate
    ? `${Math.round(repo.external_pr_merge_rate)}% Merge Rate`
    : null;

  const responseTimeStr = formatBadgeLatency(getPositiveResponseHours(repo));

  return (
    <div
      className={`fixed top-14 left-0 right-0 z-40 w-full bg-[rgba(9,13,22,0.92)] backdrop-blur-md border-b border-[var(--border-subtle)] shadow-lg transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
    >
      <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-2">
        {/* Row 1: Repo identity, rank, stats, action buttons */}
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`tier-badge tier-${rank || "A"} shrink-0`}>
              {rank || " - "}
            </span>

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-[340px]">
                {fullName}
              </span>

              {mergeRateStr && (
                <span className="pill pill-green hidden md:inline-flex">{mergeRateStr}</span>
              )}

              {responseTimeStr && (
                <span className="pill hidden lg:inline-flex">{responseTimeStr}</span>
              )}

              {typeof repo?.stars === "number" && (
                <span className="pill">
                  <Star className="h-3 w-3 fill-[#C4910A] text-[#C4910A]" />
                  <span className="tabular">{repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}</span>
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
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors border cursor-pointer ${
                isWatching
                  ? "bg-[rgba(163,113,247,0.15)] border-[var(--border-accent)] text-[var(--purple-bright)]"
                  : "bg-[#0D111A] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Bookmark className={`h-3 w-3 ${isWatching ? "fill-current" : ""}`} />
              <span className="hidden sm:inline">{isWatching ? "Saved" : "Watch"}</span>
            </button>

            <a
              href={`https://github.com/${fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`View ${fullName} on GitHub`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-[var(--text-primary)] text-[var(--bg-canvas)] hover:bg-[var(--color-neutral-800)] transition-colors shadow-xs"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Row 2: Section Tabs */}
        <div
          ref={tabsScrollRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
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
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[rgba(163,113,247,0.2)] text-white border border-[var(--border-accent)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                }`}
              >
                <Icon className={`h-3 w-3 ${isActive ? "text-[var(--purple-bright)]" : ""}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
