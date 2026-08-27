import React from "react";
import Link from "next/link";
import { Bookmark, GitPullRequest, Star, Scale, CircleDot, Check } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";
import { getLanguageSlug } from "@/lib/languageSlug";
import { Repo } from "@/types/opendoor";
import { CRankBadge } from "@/components/CRankBadge";

interface RepoDetailHeroProps {
  fullName: string;
  repo: Repo | null;
  rank: string;
  rankLabel: string;
  score: number;
  isWatching: boolean;
  watchLoading: boolean;
  isClaimed?: boolean;
  isVerified?: boolean;
  onClaimClick?: () => void;
  onWatchToggle: () => void;
  onGithubClick: () => void;
}

export function RepoDetailHero({
  fullName,
  repo,
  rank,
  score,
  isWatching,
  watchLoading,
  isVerified,
  onClaimClick,
  onWatchToggle,
  onGithubClick,
}: RepoDetailHeroProps) {
  const owner = repo?.owner || fullName.split("/")[0];
  const ownerAvatarUrl = `https://github.com/${owner}.png?size=64`;
  const roundedScore = Math.round(score);
  const isScored = repo?.is_scored ?? (score > 0);

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Identity & Metadata */}
        <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ownerAvatarUrl}
            alt={owner}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-white/[0.1] bg-zinc-900 shrink-0 object-cover shadow-inner mt-1"
          />
          <div className="min-w-0 flex-1">
            {/* Repo Title & Stars */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold font-sans text-zinc-100 tracking-tight leading-tight break-all">
                {fullName}
              </h1>
              {typeof repo?.stars === "number" && repo.stars >= 0 && (
                <span
                  title={`${repo.stars.toLocaleString()} GitHub stars`}
                  className="inline-flex items-center gap-1.5 border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-xs font-medium rounded-full text-zinc-300 shadow-xs shrink-0"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}</span>
                </span>
              )}
            </div>

            {/* Verdict & Language Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {isScored ? (
                <>
                  <CRankBadge rank={rank} size="md" showLabel={true} />
                  {roundedScore > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-semibold rounded-full bg-white/[0.05] text-zinc-200 border border-white/[0.08]">
                      <span className="text-zinc-400">Score:</span>
                      <span className="text-emerald-400 font-bold">{roundedScore}</span>
                      <span className="text-zinc-500 font-normal">/100</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.06] font-mono text-xs">
                  Unscored
                </span>
              )}

              {repo?.language && (
                <Link
                  href={`/rankings/${getLanguageSlug(repo.language)}`}
                  title={`View top ranked ${repo.language} repositories`}
                  className="inline-flex items-center gap-1.5 border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-mono text-xs font-medium rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
                >
                  <LangLogo language={repo.language} />
                  <span>{repo.language}</span>
                </Link>
              )}

              {isVerified && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium">
                  <Check className="h-3 w-3" />
                  <span>Verified Contributor</span>
                </span>
              )}
            </div>

            {/* Description */}
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed font-sans max-w-3xl">
              {repo?.description || "Open-source repository analyzed with precision C-Rank telemetry."}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 lg:flex-col lg:items-end">
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={onWatchToggle}
              disabled={watchLoading}
              title={isWatching ? "Remove from watchlist" : "Add to watchlist"}
              className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono font-semibold rounded-xl border transition-all cursor-pointer ${
                isWatching
                  ? "bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25"
                  : "bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isWatching ? "fill-orange-400 text-orange-400" : ""}`} />
              <span>{isWatching ? "Watchlisted" : "Watchlist"}</span>
            </button>

            <button
              type="button"
              onClick={onGithubClick}
              title={`View ${fullName} on GitHub`}
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono font-semibold rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-all shadow-sm cursor-pointer"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <Link
              href={`/compare?a=${encodeURIComponent(fullName)}`}
              title={`Compare ${fullName} against another repository`}
              className="inline-flex items-center gap-1 hover:text-zinc-300 transition-colors"
            >
              <Scale className="h-3 w-3" />
              <span>Compare</span>
            </Link>
            {onClaimClick && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={onClaimClick}
                  title="Claim repository maintainership"
                  className="inline-flex items-center gap-1 hover:text-orange-400 transition-colors cursor-pointer"
                >
                  <CircleDot className="h-3 w-3" />
                  <span>Claim</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
