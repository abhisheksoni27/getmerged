"use client";

import React from "react";
import { Repo } from "@/types/opendoor";
import { Star, GitMerge, Clock, ArrowUpRight, Flame, Sparkles, ShieldCheck } from "lucide-react";
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

  const getRankBadgeClass = (r?: string) => {
    switch (r) {
      case "S":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-emerald-500/10";
      case "A":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      case "B":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "C":
        return "bg-purple-50 text-purple-700 border-purple-200/80";
      case "D":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      default:
        return "bg-zinc-50 text-zinc-600 border-zinc-200";
    }
  };

  const getRankHumanLabel = (r?: string) => {
    switch (r) {
      case "S":
        return "Super Welcoming";
      case "A":
        return "Welcoming";
      case "B":
        return "Moderate";
      case "C":
        return "Slow Review";
      case "D":
        return "Unmaintained";
      default:
        return "Scored";
    }
  };

  // Helper for star bucket calculation if missing from legacy response
  const getStarBucket = (stars: number, bucket?: string) => {
    if (bucket) return bucket;
    if (stars >= 50000) return "50k+";
    if (stars >= 20000) return "20k-50k";
    if (stars >= 5000) return "5k-20k";
    if (stars >= 1000) return "1k-5k";
    if (stars >= 500) return "500-1k";
    return "<500";
  };

  const formatResponseBucket = (hours?: number): string => {
    if (!hours) return "Unknown response time";
    if (hours < 1) return "<1h response";
    if (hours < 24) return `~${Math.floor(hours)}h response`;
    const days = Math.floor(hours / 24);
    return `~${days}d+ response`;
  };

  const responseTimeDisplay = formatResponseBucket(repo.time_to_first_response_hours);

  const mergeRateDisplay =
    repo.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate > 0
      ? `${repo.external_pr_merge_rate.toFixed(1)}% merged`
      : "—";

  const firstTimerDisplay =
    repo.first_timer_success_rate !== undefined && repo.first_timer_success_rate >= 0
      ? `${repo.first_timer_success_rate.toFixed(1)}% 1st-timer`
      : null;

  const handleClick = () => {
    posthog.capture('repo_card_clicked', {
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
      className="group relative flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs hover:border-zinc-300 hover:shadow-md transition-all duration-200 block text-current no-underline"
    >
      {/* Top Meta Bar */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="font-mono text-base font-semibold text-zinc-900 group-hover:text-zinc-700 transition-colors flex items-center gap-1.5 min-w-0 break-all">
            <span className="truncate">{repo.full_name}</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {repo.is_trending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600 border border-orange-200/60">
                <Flame className="h-3 w-3 fill-orange-500" />
                Trending
              </span>
            )}
            <span
              className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 font-mono text-xs font-bold shrink-0 whitespace-nowrap ${getRankBadgeClass(
                rank
              )}`}
            >
              {getRankHumanLabel(rank)}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-4">
          {repo.description || "No description provided."}
        </p>
      </div>

      {/* Metrics Row */}
      <div>
        <div className="flex items-center gap-1.5 text-zinc-600 mb-4 font-mono">
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
          <span>{repo.stars >= 1_000_000 ? `${(repo.stars / 1_000_000).toFixed(1).replace(/\.0$/, "")}m+` : repo.stars >= 1_000 ? `${Math.floor(repo.stars / 1_000)}k+` : repo.stars.toLocaleString()}</span>
        </div>

        {/* Secondary Metrics Bar */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-zinc-500 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span>{responseTimeDisplay}</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <GitMerge className="h-3.5 w-3.5 text-zinc-400" />
            <span>{mergeRateDisplay}</span>
          </div>
          {firstTimerDisplay && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                <span>{firstTimerDisplay}</span>
              </div>
            </>
          )}
        </div>

        {/* Issue #25 & #30 Fix: Clean AI Sparkly Button trigger instead of cluttered blurred box */}
        <div className="relative overflow-hidden rounded-xl bg-zinc-900 p-3 text-white shadow-xs group-hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-emerald-400" /> AI Maintainer Vibe
            </span>
            <span className="text-[10px] text-zinc-400 group-hover:text-white transition-colors">
              {isLoggedIn ? "View Insights →" : "Sign in to unlock →"}
            </span>
          </div>
        </div>

        {/* Footer Tags */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
            <LangLogo language={repo.language} />
            {repo.language || "Other"}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-500 font-sans">
            {getStarBucket(repo.stars, repo.star_bucket)} stars
          </span>
        </div>
      </div>
    </Link>
  );
}
