"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookmarkX,
  Star,
  ArrowUpRight,
  Scale,
  ShieldCheck,
  Flame,
  Bell,
  BellOff,
} from "lucide-react";
import posthog from "posthog-js";
import { LangLogo } from "@/components/LangLogo";
import { getBadgeStyle, WatchedRepoItem } from "./watchlistTypes";
import { TierDeltaIndicatorChip } from "./TierDeltaIndicatorChip";

export interface WatchedCardProps {
  item: WatchedRepoItem;
  onUnwatch: (repoId: string, fullName: string) => Promise<void>;
  alertsEnabled: boolean;
  onToggleAlerts: (repoId: string, enabled: boolean) => Promise<boolean>;
}

export function WatchedRepoCard({ item, onUnwatch, alertsEnabled, onToggleAlerts }: WatchedCardProps) {
  const router = useRouter();
  const { repo, history } = item;
  const rank = repo.class_rank || repo.c_rank_tier || "A";
  const [ownerPart, namePart] = repo.full_name ? repo.full_name.split("/") : [repo.owner || "", repo.name || ""];
  const [isRemoving, setIsRemoving] = useState(false);
  const [alertsOn, setAlertsOn] = useState(alertsEnabled);

  useEffect(() => {
    setAlertsOn(alertsEnabled);
  }, [alertsEnabled]);

  const badgeStyle = getBadgeStyle(rank);

  const mergeRate =
    repo.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate > 0
      ? `${Math.round(repo.external_pr_merge_rate)}%`
      : "-";

  const firstResponseHours = repo.time_to_first_response_hours;
  const firstResponse =
    firstResponseHours && firstResponseHours > 0
      ? firstResponseHours < 1
        ? "<1h"
        : firstResponseHours < 24
        ? `${Math.round(firstResponseHours)}h`
        : `${Math.round(firstResponseHours / 24)}d`
      : "-";

  const firstTimerRate =
    repo.first_timer_success_rate !== undefined && repo.first_timer_success_rate >= 0
      ? `${Math.round(repo.first_timer_success_rate)}%`
      : "-";

  const gfiCount = repo.good_first_issue_count ?? 0;
  const gfiLabel = gfiCount === 1 ? "1 good first issue" : `${gfiCount} good first issues`;

  const handleUnwatchClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRemoving(true);
    try {
      await onUnwatch(String(repo.id || repo.full_name), repo.full_name);
    } catch {
      setIsRemoving(false);
    }
  };

  const handleToggleAlertsClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !alertsOn;
    setAlertsOn(next);
    const ok = await onToggleAlerts(String(repo.id || repo.full_name), next);
    if (!ok) setAlertsOn(!next);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    posthog.capture("compare_cta_clicked", {
      repo_full_name: repo.full_name,
      source: "watchlist_card",
    });
    router.push(`/compare?a=${encodeURIComponent(repo.full_name)}`);
  };

  const scoreDisplay =
    repo.c_rank_score !== undefined && repo.c_rank_score > 0
      ? repo.c_rank_score.toFixed(1)
      : "0.0";

  return (
    <div
      className={`group p-5 rounded-2xl border border-white/[0.1] glass-panel hover:border-emerald-500/80 hover:shadow-xs transition-all flex flex-col justify-between gap-4 ${
        isRemoving ? "opacity-40 pointer-events-none scale-[0.98]" : ""
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-xl border border-white/[0.1] glass-card overflow-hidden shrink-0 shadow-2xs group-hover:border-white/[0.12] transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://github.com/${ownerPart}.png?size=64`}
                alt={ownerPart}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png?size=64";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/${ownerPart}/${namePart}`}
                title={`View ${repo.full_name} scorecard`}
                className="font-space text-base font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1 min-w-0 no-underline"
              >
                <h3 className="truncate text-base font-bold">{repo.full_name}</h3>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-300 shrink-0" />
              </Link>
              <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-zinc-300">
                <span className="flex items-center gap-1 font-semibold text-zinc-300">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                  {repo.stars >= 1_000 ? `${(repo.stars / 1_000).toFixed(1)}k` : repo.stars}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 truncate text-zinc-300">
                  <LangLogo language={repo.language} />
                  <span className="truncate">{repo.language || "Code"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action & Badge Group */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleAlertsClick}
              aria-label={alertsOn ? `Disable C-Rank alerts for ${repo.full_name}` : `Enable C-Rank alerts for ${repo.full_name}`}
              title={alertsOn ? "Email alerts on - click to mute" : "Email alerts off - click to enable"}
              data-testid={`alerts-toggle-${ownerPart}-${namePart}`}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                alertsOn
                  ? "border-emerald-200 text-emerald-400 bg-emerald-950/70 border-emerald-800/80 hover:bg-emerald-950/80 border-emerald-800/80"
                  : "border-white/[0.1] text-zinc-300 hover:text-zinc-300 hover:glass-card"
              }`}
            >
              {alertsOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleUnwatchClick}
              aria-label={`Unwatch ${repo.full_name}`}
              title={`Remove ${repo.full_name} from watchlist`}
              className="p-1.5 rounded-lg border border-white/[0.1] text-zinc-300 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <BookmarkX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tier & Score Row with Delta Chip */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* C-Rank Tier Pill */}
          <div
            className={`px-2.5 py-0.5 rounded-xl text-xs font-bold font-mono border shrink-0 flex items-center gap-1.5 ${badgeStyle.badgeClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badgeStyle.indicatorColor}`} />
            <span>Tier {rank}</span>
            <span className="text-zinc-300 font-normal">|</span>
            <span className="text-white font-extrabold">{scoreDisplay}</span>
          </div>

          {/* Delta Indicator Chip */}
          <TierDeltaIndicatorChip repo={repo} history={history} />
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-sans font-normal mb-4 min-h-[2.5rem]">
          {repo.description || "No repository description available."}
        </p>

        {/* Telemetry Metrics Scorecard */}
        <div className="grid grid-cols-3 gap-3 py-3 px-3.5 glass-panel rounded-xl border border-white/[0.1]/90 my-auto text-center font-mono">
          <div className="pr-1">
            <div className="text-xs font-bold text-white">{mergeRate}</div>
            <div className="text-[10px] text-zinc-300 font-medium whitespace-nowrap mt-0.5">Merge Rate</div>
          </div>
          <div className="border-x border-white/[0.1] px-1">
            <div className="text-xs font-bold text-white">{firstResponse}</div>
            <div className="text-[10px] text-zinc-300 font-medium whitespace-nowrap mt-0.5">First Review</div>
          </div>
          <div className="pl-1">
            <div className="text-xs font-bold text-white">{firstTimerRate}</div>
            <div className="text-[10px] text-zinc-300 font-medium whitespace-nowrap mt-0.5">1st-Timers</div>
          </div>
        </div>
      </div>

      {/* Footer Row */}
      <div className="pt-3 border-t border-white/[0.1] flex items-center justify-between text-xs font-mono text-zinc-300">
        <div className="flex items-center gap-2">
          {gfiCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/70 border-emerald-800/80 px-2 py-0.5 rounded border border-emerald-200/60 font-medium text-[10px]">
              <ShieldCheck className="h-3 w-3" />
              {gfiLabel}
            </span>
          ) : repo.is_trending ? (
            <span className="inline-flex items-center gap-0.5 text-orange-700 font-medium text-[10px]">
              <Flame className="h-3 w-3 fill-orange-500" />
              Trending
            </span>
          ) : (
            <span className="text-[11px]">
              {repo.snapshot_date ? `Snapshot ${repo.snapshot_date}` : "Telemetry active"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="compare-cta"
            title={`Compare ${repo.full_name} with another repository`}
            aria-label={`Compare ${repo.full_name}`}
            onClick={handleCompareClick}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-emerald-400 glass-card/70 hover:bg-emerald-950/70 border-emerald-800/80 px-2 py-1 rounded-md border border-white/[0.1]/60 transition-colors cursor-pointer"
          >
            <Scale className="h-3 w-3" />
            <span>Compare</span>
          </button>
          <Link
            href={`/${ownerPart}/${namePart}`}
            title={`View ${repo.full_name} details and C-Rank breakdown`}
            className="font-semibold text-white hover:text-emerald-400 transition-colors flex items-center gap-0.5 no-underline"
          >
            View details →
          </Link>
        </div>
      </div>
    </div>
  );
}
