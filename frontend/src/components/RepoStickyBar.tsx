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

  const getRankBadgeBg = (r: string) => {
    switch (r) {
      case "S":
        return "bg-[#8ce99a]";
      case "A":
        return "bg-[#bfdbff]";
      case "B":
        return "bg-[#ffd93d]";
      case "C":
        return "bg-[#e5dbff]";
      default:
        return "bg-[#ffb3c7]";
    }
  };

  return (
    <div
      className={`sticky top-16 z-40 w-full bg-[#0f172a]/95 backdrop-blur-md border-b-2 border-slate-700 shadow-sm transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-3 pointer-events-none"
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
              className="w-6.5 h-6.5 rounded-lg border border-slate-700 bg-[#1e293b] object-cover shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png?size=64";
              }}
            />
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-space font-bold text-xs sm:text-sm text-slate-50 truncate max-w-[200px] sm:max-w-[360px]">
                {fullName}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold rounded-md border border-black text-slate-100 ${getRankBadgeBg(
                  rank
                )}`}
              >
                {rankLabel}
              </span>
              {typeof repo?.stars === "number" && (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-slate-400">
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
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border border-slate-700 cursor-pointer ${
                isWatching
                  ? "bg-amber-950/80 border-amber-800/80 text-amber-300 hover:bg-amber-200"
                  : "bg-[#111827] text-slate-200 hover:bg-[#1e293b]"
              }`}
            >
              <Bookmark className={`h-3 w-3 ${isWatching ? "fill-amber-500 text-amber-600" : "text-slate-400"}`} />
              <span className="hidden sm:inline">{isWatching ? "Watching" : "Watch"}</span>
            </button>
            <a
              href={`https://github.com/${fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`View ${fullName} on GitHub`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#0f172a] text-white hover:bg-zinc-800 transition-colors border border-black"
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
                    ? "bg-[#ffd93d] text-slate-50 font-bold border border-slate-700 shadow-sm"
                    : "bg-[#111827] text-slate-300 hover:bg-[#1e293b] border border-slate-700 font-medium hover:text-slate-100"
                }`}
              >
                <Icon className={`h-3 w-3 ${isActive ? "text-slate-100 font-bold" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
