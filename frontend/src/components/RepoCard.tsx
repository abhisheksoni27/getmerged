"use client";

import React from "react";
import { Repo } from "@/types/opendoor";
import { Star, ArrowUpRight, Flame, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { LangLogo } from "@/components/LangLogo";
import posthog from "posthog-js";

interface RepoCardProps {
  repo: Repo;
  isLoggedIn?: boolean;
}

export function RepoCard({ repo, isLoggedIn = false }: RepoCardProps) {
  const rank = repo.class_rank || repo.c_rank_tier || "A";
  const [ownerPart, namePart] = repo.full_name ? repo.full_name.split("/") : [repo.owner || "", repo.name || ""];

  // Neo-brutalism sticker badge styling with high visual rhythm & clear layman labels
  const getBadgeStyle = (r?: string) => {
    switch (r) {
      case "S":
        return {
          badgeClass: "bg-brand-cream text-brand-dark border-2 border-brand-dark shadow-[2px_2px_0px_#222831] rotate-1 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#222831]",
          label: "Super Welcoming",
          iconColor: "text-zinc-900",
        };
      case "A":
        return {
          badgeClass: "bg-blue-100 text-blue-950 border-2 border-blue-900 shadow-[2px_2px_0px_#1e3a8a] -rotate-1 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#1e3a8a]",
          label: "Welcoming",
          iconColor: "text-blue-900",
        };
      case "B":
        return {
          badgeClass: "bg-amber-100 text-amber-950 border-2 border-amber-900 shadow-[2px_2px_0px_#78350f] rotate-1 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#78350f]",
          label: "Moderate",
          iconColor: "text-amber-900",
        };
      case "C":
        return {
          badgeClass: "bg-purple-100 text-purple-950 border-2 border-purple-900 shadow-[2px_2px_0px_#581c87] -rotate-1 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#581c87]",
          label: "Slow Review",
          iconColor: "text-purple-900",
        };
      case "D":
        return {
          badgeClass: "bg-rose-100 text-rose-950 border-2 border-rose-900 shadow-[2px_2px_0px_#9f123b] rotate-1 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#9f123b]",
          label: "Unmaintained",
          iconColor: "text-rose-900",
        };
      default:
        return {
          badgeClass: "bg-zinc-100 text-zinc-900 border-2 border-zinc-700 shadow-[2px_2px_0px_#27272a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#27272a]",
          label: "Scored Repo",
          iconColor: "text-zinc-700",
        };
    }
  };

  const badgeStyle = getBadgeStyle(rank);

  // Format metrics cleanly
  const mergeRate =
    repo.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate > 0
      ? `${Math.round(repo.external_pr_merge_rate)}%`
      : null;

  const firstResponseHours = repo.time_to_first_response_hours;
  const firstResponse =
    firstResponseHours && firstResponseHours > 0
      ? firstResponseHours < 1
        ? "<1h"
        : firstResponseHours < 24
        ? `${Math.round(firstResponseHours)}h`
        : `${Math.round(firstResponseHours / 24)}d`
      : null;

  const firstTimerRate =
    repo.first_timer_success_rate !== undefined && repo.first_timer_success_rate >= 0
      ? `${Math.round(repo.first_timer_success_rate)}%`
      : null;

  // Key "Why Contribute" bullets
  const insights: string[] = [];
  if (firstResponseHours && firstResponseHours <= 24) {
    insights.push(`Maintainers review within ${firstResponse}`);
  }
  if (repo.external_pr_merge_rate && repo.external_pr_merge_rate >= 70) {
    insights.push(`${Math.round(repo.external_pr_merge_rate)}% PR merge rate`);
  }
  if (repo.first_timer_success_rate && repo.first_timer_success_rate >= 40) {
    insights.push(`Welcomes first-time contributors`);
  }
  if (insights.length === 0) {
    if (rank === "S" || rank === "A") insights.push("Active maintenance cadence");
    else insights.push("Scored repository metrics");
  }

  const handleClick = () => {
    posthog.capture("repo_card_clicked", {
      repo_full_name: repo.full_name,
      repo_language: repo.language,
      repo_tier: rank,
      repo_stars: repo.stars,
    });
  };

  return (
    <Link
      href={`/repo/${ownerPart}/${namePart}`}
      onClick={handleClick}
      className="group relative flex h-full flex-col justify-between rounded-xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 border border-zinc-200/90 block text-current no-underline cursor-pointer"
    >
      <div className="flex flex-col flex-1">
        {/* Header: Name + Neo-Brutalism Sticker Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="font-space text-base font-extrabold text-zinc-900 group-hover:text-zinc-700 transition-colors flex items-center gap-1 min-w-0">
              <span className="truncate">{repo.full_name}</span>
              <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all text-zinc-400 shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-1 font-mono text-xs text-zinc-500">
              <span className="flex items-center gap-1 text-amber-700 font-bold">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {repo.stars >= 1_000 ? `${(repo.stars / 1_000).toFixed(1)}k` : repo.stars}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-zinc-700 font-medium">
                <LangLogo language={repo.language} />
                {repo.language || "Code"}
              </span>
              {repo.is_trending && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-0.5 text-orange-600 font-bold">
                    <Flame className="h-3 w-3 fill-orange-500" />
                    Trending
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Neo-Brutalism Sticker Badge */}
          <div className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold shrink-0 transition-transform ${badgeStyle.badgeClass}`}>
            {badgeStyle.label}
          </div>
        </div>

        {/* Fixed Height Clamped Description */}
        <div className="min-h-[2.5rem] mb-3">
          <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed font-sans">
            {repo.description || "No repository description available."}
          </p>
        </div>

        {/* Structured Metrics Scorecard */}
        <div className="grid grid-cols-3 gap-2 py-1.5 text-center bg-zinc-50/80 rounded-lg border border-zinc-100 p-2 my-2">
          <div>
            <div className="font-mono text-xs font-bold text-zinc-900">{mergeRate || "—"}</div>
            <div className="font-mono text-[10px] text-zinc-400">Merge Rate</div>
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-zinc-900">{firstResponse || "—"}</div>
            <div className="font-mono text-[10px] text-zinc-400">First Review</div>
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-zinc-900">{firstTimerRate || "—"}</div>
            <div className="font-mono text-[10px] text-zinc-400">1st-Timers</div>
          </div>
        </div>

        {/* "Why Contribute?" Highlights */}
        <div className="space-y-1.5 my-2 flex-1">
          {insights.slice(0, 2).map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-800 font-sans">
              <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${badgeStyle.iconColor}`} />
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Tag & Insights trigger */}
      <div className="pt-3 mt-auto border-t border-zinc-100 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-500">
          <Sparkles className="h-3 w-3 text-zinc-400" /> Contributor Telemetry
        </span>
        <span className="font-mono text-[11px] text-zinc-900 font-bold group-hover:translate-x-0.5 transition-transform">
          {isLoggedIn ? "View Details →" : "Explore →"}
        </span>
      </div>
    </Link>
  );
}
