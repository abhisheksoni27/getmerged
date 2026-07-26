import React from "react";
import { Repo } from "@/types/opendoor";
import { Star, GitMerge, Clock, Lock, ArrowUpRight, Flame } from "lucide-react";
import Link from "next/link";
import { LangLogo } from "@/components/LangLogo";

interface RepoCardProps {
  repo: Repo;
}

export function RepoCard({ repo }: RepoCardProps) {
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

  // Humanize response time into clean buckets: <1h, ~18h, ~2d, ~1w, ~3w, ~2mo
  const formatResponseBucket = (hours?: number): string => {
    if (hours === undefined || hours === null || hours <= 0) return "No review data";
    if (hours < 1) return "< 1h response";
    if (hours < 24) return `~${Math.round(hours)}h response`;

    const days = Math.round(hours / 24);
    if (days < 7) return `~${days}d response`;

    const weeks = Math.round(days / 7);
    if (weeks < 4) return `~${weeks}w response`;

    const months = Math.round(days / 30);
    return `~${months}mo response`;
  };

  const responseTimeDisplay = formatResponseBucket(repo.time_to_first_response_hours);

  const mergeRateDisplay =
    repo.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate > 0
      ? `${repo.external_pr_merge_rate.toFixed(1)}% merged`
      : "—";

  return (
    <Link
      href={`/repo/${ownerPart}/${namePart}`}
      className="group relative flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-5 shadow-xs hover:border-zinc-300 hover:shadow-md transition-all duration-200 block text-current no-underline"
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
        <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-4">
          {repo.description || "No description provided."}
        </p>
      </div>

      {/* Metrics Row */}
      <div>
        <div className="flex items-center gap-1.5 text-zinc-600 mb-4 font-mono">
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
          <span>{repo.stars.toLocaleString()}</span>
        </div>

        {/* Secondary Metrics Bar */}
        <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span>{responseTimeDisplay}</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <GitMerge className="h-3.5 w-3.5 text-zinc-400" />
            <span>{mergeRateDisplay}</span>
          </div>
        </div>

        {/* Gated AI Vibe Teaser */}
        <div className="relative overflow-hidden rounded-lg bg-zinc-50/80 p-2.5 border border-zinc-100">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
            <span className="font-mono text-zinc-400">MAINTAINER VIBE</span>
            <Lock className="h-3 w-3 text-zinc-400" />
          </div>
          <p className="text-xs text-zinc-700 blur-[3px] select-none">
            Active and welcoming maintainer team with very fast turnaround on PR reviews.
          </p>
          <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
            <span className="text-[11px] font-medium text-zinc-900 underline underline-offset-2 group-hover:text-emerald-600">
              Sign in to view AI Insights
            </span>
          </div>
        </div>

        {/* Footer Tags */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <span className="flex items-center gap-1.5 text-zinc-700 font-medium">
            <LangLogo language={repo.language} />
            {repo.language || "Other"}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 font-sans">
            {getStarBucket(repo.stars, repo.star_bucket)} stars
          </span>
        </div>
      </div>
    </Link>
  );
}
