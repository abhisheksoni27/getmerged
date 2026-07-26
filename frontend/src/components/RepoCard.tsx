import React from "react";
import { Repo } from "@/types/opendoor";
import { Star, GitMerge, Clock, Lock, ArrowUpRight, Flame } from "lucide-react";
import Link from "next/link";

interface RepoCardProps {
  repo: Repo;
}

export function RepoCard({ repo }: RepoCardProps) {
  const getRankBadgeClass = (rank?: string) => {
    switch (rank) {
      case "S":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-emerald-500/10";
      case "A":
        return "bg-emerald-50/60 text-emerald-600 border-emerald-200/60";
      case "B":
      case "C":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "D":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      default:
        return "bg-zinc-50 text-zinc-600 border-zinc-200";
    }
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-5 shadow-xs hover:border-zinc-300 hover:shadow-md transition-all duration-200">
      {/* Top Meta Bar */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <Link
            href={`/repo/${repo.owner}/${repo.name}`}
            className="font-mono text-base font-semibold text-zinc-900 group-hover:text-zinc-700 transition-colors flex items-center gap-1.5"
          >
            {repo.full_name}
            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
          </Link>
          <div className="flex items-center gap-2">
            {repo.is_trending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600 border border-orange-200/60">
                <Flame className="h-3 w-3 fill-orange-500" />
                Trending
              </span>
            )}
            <span
              className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${getRankBadgeClass(
                repo.class_rank || "A"
              )}`}
            >
              {repo.class_rank || "A"} Rank
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
        <div className="grid grid-cols-3 gap-2 border-t border-b border-zinc-100 py-2.5 mb-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-600">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
            <span>{repo.stars.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600">
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span>~4h response</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600">
            <GitMerge className="h-3.5 w-3.5 text-emerald-500" />
            <span>88% merged</span>
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
            <Link
              href={`/repo/${repo.owner}/${repo.name}`}
              className="text-[11px] font-medium text-zinc-900 underline underline-offset-2 hover:text-emerald-600"
            >
              Sign in to view AI Insights
            </Link>
          </div>
        </div>

        {/* Footer Tags */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <span>{repo.language || "Other"}</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 font-sans">
            {repo.star_bucket || "1k-5k"} stars
          </span>
        </div>
      </div>
    </div>
  );
}
