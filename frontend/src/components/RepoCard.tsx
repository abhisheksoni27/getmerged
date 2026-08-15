"use client";

import React from "react";
import { Repo } from "@/types/opendoor";
import { Star, ArrowUpRight, Flame, ShieldCheck } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";
import posthog from "posthog-js";

interface RepoCardProps {
  repo: Repo;
  isLoggedIn?: boolean;
  isSpotlight?: boolean;
  spotlightIndex?: number;
}

export function RepoCard({ repo, isSpotlight = false }: RepoCardProps) {
  const rank = repo.class_rank || repo.c_rank_tier || "A";
  const [ownerPart, namePart] = repo.full_name ? repo.full_name.split("/") : [repo.owner || "", repo.name || ""];

  const getBadgeStyle = (r?: string) => {
    switch (r) {
      case "S":
        return {
          badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/30",
          label: "Super Welcoming",
          indicatorColor: "bg-emerald-500",
        };
      case "A":
        return {
          badgeClass: "bg-blue-50 text-blue-900 border-blue-200 ring-1 ring-blue-300/30",
          label: "Welcoming",
          indicatorColor: "bg-blue-500",
        };
      case "B":
        return {
          badgeClass: "bg-amber-50 text-amber-900 border-amber-200 ring-1 ring-amber-300/30",
          label: "Moderate",
          indicatorColor: "bg-amber-500",
        };
      case "C":
        return {
          badgeClass: "bg-purple-50 text-purple-900 border-purple-200 ring-1 ring-purple-300/30",
          label: "Slow Review",
          indicatorColor: "bg-purple-500",
        };
      case "D":
        return {
          badgeClass: "bg-rose-50 text-rose-900 border-rose-200 ring-1 ring-rose-300/30",
          label: "Unmaintained",
          indicatorColor: "bg-rose-500",
        };
      default:
        return {
          badgeClass: "bg-zinc-50 text-zinc-900 border-zinc-200 ring-1 ring-zinc-300/30",
          label: "Scored",
          indicatorColor: "bg-zinc-400",
        };
    }
  };

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

  const handleClick = () => {
    posthog.capture("repo_card_clicked", {
      repo_full_name: repo.full_name,
      repo_language: repo.language,
      repo_tier: rank,
      repo_stars: repo.stars,
    });
  };

  return (
    <a
      href={`/${ownerPart}/${namePart}`}
      onClick={handleClick}
      title={`View ${repo.full_name} C-Rank scorecard, PR response time & merge metrics`}
      className={`group relative flex h-full flex-col justify-between rounded-2xl p-5 border transition-all duration-200 block text-current no-underline cursor-pointer ${
        isSpotlight
          ? "border-zinc-300 bg-white shadow-md hover:shadow-lg hover:border-zinc-400 hover:-translate-y-0.5"
          : "border-zinc-200/90 bg-white shadow-xs hover:shadow-md hover:border-zinc-300 hover:-translate-y-0.5"
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-xl border border-zinc-200/80 bg-zinc-50 overflow-hidden shrink-0 shadow-2xs group-hover:border-zinc-300 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://github.com/${ownerPart}.png`}
                alt={ownerPart}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-space text-sm font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors flex items-center gap-1 min-w-0" title={repo.full_name}>
                <span className="truncate">{repo.full_name}</span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-zinc-500">
                <span className="flex items-center gap-1 font-semibold text-zinc-700">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                  {repo.stars >= 1_000 ? `${(repo.stars / 1_000).toFixed(1)}k` : repo.stars}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 truncate text-zinc-600">
                  <LangLogo language={repo.language} />
                  <span className="truncate">{repo.language || "Code"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Rank Badge */}
          <div className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono border shrink-0 flex items-center gap-1.5 ${badgeStyle.badgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badgeStyle.indicatorColor}`} />
            <span>{badgeStyle.label}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed font-sans font-normal mb-4 min-h-[2.5rem]">
          {repo.description || "No repository description available."}
        </p>

        {/* Telemetry Metrics Scorecard with clean spacing & dividers */}
        <div className="grid grid-cols-3 gap-3 py-3 px-3.5 bg-zinc-50/80 rounded-xl border border-zinc-100/90 my-auto text-center font-mono">
          <div className="pr-1">
            <div className="text-xs font-bold text-zinc-900">{mergeRate}</div>
            <div className="text-[10px] text-zinc-500 font-medium whitespace-nowrap mt-0.5">Merge Rate</div>
          </div>
          <div className="border-x border-zinc-200/70 px-1">
            <div className="text-xs font-bold text-zinc-900">{firstResponse}</div>
            <div className="text-[10px] text-zinc-500 font-medium whitespace-nowrap mt-0.5">First Review</div>
          </div>
          <div className="pl-1">
            <div className="text-xs font-bold text-zinc-900">{firstTimerRate}</div>
            <div className="text-[10px] text-zinc-500 font-medium whitespace-nowrap mt-0.5">1st-Timers</div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] font-mono text-zinc-500">
        <div className="flex items-center gap-2">
          {gfiCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-medium text-[10px]">
              <ShieldCheck className="h-3 w-3" />
              {gfiLabel}
            </span>
          ) : repo.is_trending ? (
            <span className="inline-flex items-center gap-0.5 text-orange-700 font-medium">
              <Flame className="h-3 w-3 fill-orange-500" />
              Trending
            </span>
          ) : (
            <span>Telemetry active</span>
          )}
        </div>
        <span className="font-semibold text-zinc-900 group-hover:text-zinc-700 flex items-center gap-0.5">
          View details →
        </span>
      </div>
    </a>
  );
}
