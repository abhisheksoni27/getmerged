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
        return "bg-brand-cream text-brand-dark border-brand-dark shadow-[2px_2px_0px_#222831] rotate-1";
      case "A":
        return "bg-blue-100 text-blue-900 border-blue-900 shadow-[2px_2px_0px_#1e3a8a] -rotate-1";
      case "B":
        return "bg-amber-100 text-amber-900 border-amber-900 shadow-[2px_2px_0px_#78350f] rotate-1";
      case "C":
        return "bg-purple-100 text-purple-900 border-purple-900 shadow-[2px_2px_0px_#581c87] -rotate-1";
      case "D":
        return "bg-rose-100 text-rose-900 border-rose-900 shadow-[2px_2px_0px_#9f123b] rotate-1";
      default:
        return "bg-zinc-100 text-zinc-800 border-zinc-700 shadow-[2px_2px_0px_#27272a]";
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
      className="group relative flex flex-col justify-between rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(34,40,49,0.06)] hover:-translate-y-1 transition-all duration-300 border border-zinc-100 block text-current no-underline"
    >
      {/* Top Meta Bar */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="font-space text-base font-extrabold text-zinc-900 group-hover:text-zinc-700 transition-colors flex items-center gap-1.5 min-w-0 break-all">
            <span className="truncate">{repo.full_name}</span>
            <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all text-zinc-400 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {repo.is_trending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600 border border-orange-200/60">
                <Flame className="h-3 w-3 fill-orange-500" />
                Trending
              </span>
            )}
            <span
              className={`inline-flex items-center justify-center border-2 px-2.5 py-1 font-space text-[10px] font-extrabold shrink-0 rounded-xl transition-transform hover:scale-105 ${getRankBadgeClass(
                rank
              )}`}
            >
              {getRankHumanLabel(rank)}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-4 font-sans">
          {repo.description || "No description provided."}
        </p>
      </div>

      {/* Metrics Row */}
      <div>
        <div className="flex items-center gap-1.5 text-zinc-600 mb-4 font-mono text-xs">
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
          <span>{repo.stars >= 1_000_000 ? `${(repo.stars / 1_000_000).toFixed(1).replace(/\.0$/, "")}m+` : repo.stars >= 1_000 ? `${Math.floor(repo.stars / 1_000)}k+` : repo.stars.toLocaleString()}</span>
        </div>

        {/* Secondary Metrics Bar */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 font-mono text-[11px] text-zinc-500 mb-4">
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
              <div className="flex items-center gap-1 font-bold text-brand-dark bg-brand-cream border border-brand-dark/20 px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_#222831]">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-dark shrink-0" />
                <span>{firstTimerDisplay}</span>
              </div>
            </>
          )}
        </div>

        {/* Issue #25 & #30 Fix: Clean AI Sparkly Button trigger instead of cluttered blurred box */}
        <div className="relative overflow-hidden rounded-xl bg-brand-dark p-3 text-white shadow-xs transition-colors">
          <div className="flex items-center justify-between font-space text-xs">
            <span className="flex items-center gap-1.5 font-extrabold text-brand-cream">
              <Sparkles className="h-3.5 w-3.5 text-brand-cream" /> AI Maintainer Vibe
            </span>
            <span className="text-[10px] text-brand-cream/80 group-hover:text-white transition-colors">
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
          <span className="rounded-xl bg-zinc-100 px-2.5 py-1 text-zinc-500 font-sans">
            {getStarBucket(repo.stars, repo.star_bucket)} stars
          </span>
        </div>
      </div>
    </Link>
  );
}
