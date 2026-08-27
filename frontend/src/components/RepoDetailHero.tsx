import React from "react";
import Link from "next/link";
import { Check, Bookmark, GitPullRequest, Star, Scale, CircleDot } from "lucide-react";
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
    <div className="border border-slate-800 bg-[#111827] p-6 sm:p-8 rounded-md mb-6 border-t-2 border-t-slate-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Identity, Title, and Description */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ownerAvatarUrl}
            alt={owner}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-md border border-slate-700 bg-slate-800 shrink-0 object-cover mt-1"
          />
          <div className="min-w-0 flex-1">
            {/* Repo Full Name & Primary Identity */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold font-sans text-slate-50 tracking-tight leading-tight break-all">
                {fullName}
              </h1>
              {typeof repo?.stars === "number" && repo.stars >= 0 && (
                <span
                  title={`${repo.stars.toLocaleString()} GitHub stars`}
                  className="inline-flex items-center gap-1 border border-slate-700 bg-slate-800/80 px-2.5 py-1 font-mono text-xs font-semibold rounded text-slate-300 shrink-0"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}</span>
                </span>
              )}
            </div>

            {/* Verdict Badges */}
            <div className="flex flex-wrap items-center gap-2.5 mt-3">
              {isScored ? (
                <>
                  <CRankBadge rank={rank} size="md" showLabel={true} />
                  {roundedScore > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 font-mono text-xs font-semibold rounded bg-slate-800 text-slate-200 border border-slate-700">
                      <span>Score:</span>
                      <span className="text-emerald-400 font-bold">{roundedScore}</span>
                      <span className="text-slate-500">/100</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono text-xs font-semibold">
                  Unscored
                </span>
              )}

              {repo?.language && (
                <Link
                  href={`/rankings/${getLanguageSlug(repo.language)}`}
                  title={`View top ranked ${repo.language} repositories`}
                  className="inline-flex items-center gap-1.5 border border-slate-700 bg-slate-800/60 px-2.5 py-1 font-mono text-xs font-semibold rounded text-slate-300 hover:text-white hover:border-slate-500 transition-colors shrink-0"
                >
                  <LangLogo language={repo.language} />
                  <span>{repo.language}</span>
                </Link>
              )}

              {isVerified && (
                <span className="inline-flex items-center gap-1 bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded text-xs font-mono font-medium">
                  <Check className="h-3 w-3" />
                  <span>Verified Contributor</span>
                </span>
              )}
            </div>

            {/* Description */}
            <p className="mt-3 text-sm text-slate-400 leading-relaxed font-sans max-w-3xl">
              {repo?.description || "Open-source repository analyzed with precision C-Rank telemetry."}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 lg:flex-col lg:items-end">
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={onWatchToggle}
              disabled={watchLoading}
              title={isWatching ? "Remove from watchlist" : "Add to watchlist"}
              className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono font-semibold rounded border transition-colors cursor-pointer ${
                isWatching
                  ? "bg-slate-800 text-orange-400 border-orange-500/50 hover:bg-slate-700"
                  : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isWatching ? "fill-orange-400 text-orange-400" : ""}`} />
              <span>{isWatching ? "Watchlisted" : "Watchlist"}</span>
            </button>

            <button
              type="button"
              onClick={onGithubClick}
              title={`View ${fullName} on GitHub`}
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono font-semibold rounded bg-orange-500 hover:bg-orange-600 text-white transition-colors cursor-pointer"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Link
              href={`/compare?a=${encodeURIComponent(fullName)}`}
              title={`Compare ${fullName} against another repository`}
              className="inline-flex items-center gap-1 hover:text-slate-200 transition-colors"
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
                  <span>Maintainer Claim</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
