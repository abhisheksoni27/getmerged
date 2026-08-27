import React from "react";
import Link from "next/link";
import { Check, Bookmark, GitPullRequest, Star, Scale, CircleDot } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";
import { getLanguageSlug } from "@/lib/languageSlug";
import { Repo } from "@/types/opendoor";

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
  rankLabel,
  score,
  isWatching,
  watchLoading,
  isClaimed: _isClaimed,
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
    <div className="border border-zinc-200/90 bg-white p-5 sm:p-7 shadow-xs rounded-3xl mb-6 border-b-4 border-b-zinc-900">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Identity, Title, and Description */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ownerAvatarUrl}
            alt={owner}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-zinc-200 bg-zinc-50 shrink-0 object-cover shadow-2xs mt-1"
          />
          <div className="min-w-0 flex-1">
            {/* 1. Repo Full Name & Primary Identity First */}
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold font-space text-zinc-950 tracking-tight leading-tight break-all">
                {fullName}
              </h1>
              {typeof repo?.stars === "number" && repo.stars >= 0 && (
                <span
                  title={`${repo.stars.toLocaleString()} GitHub stars`}
                  className="inline-flex items-center gap-1 border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-xs font-semibold rounded-xl text-zinc-700 shadow-2xs shrink-0"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  <span>{repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}</span>
                </span>
              )}
            </div>

            {/* 2. Key Verdict & Ecosystem Badges (Clear, uncrowded) */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {isScored ? (
                <>
                  <span className={`inline-flex items-center px-2.5 py-0.5 font-mono text-xs font-bold rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] text-black ${
                    rank === "S"
                      ? "bg-[#8ce99a]"
                      : rank === "A"
                      ? "bg-[#bfdbff]"
                      : rank === "B"
                      ? "bg-[#ffd93d]"
                      : rank === "C"
                      ? "bg-[#e5dbff]"
                      : "bg-[#ffb3c7]"
                  }`}>
                    {rankLabel} (Tier {rank})
                  </span>
                  {roundedScore > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 font-mono text-xs font-bold rounded-lg bg-zinc-900 text-white shadow-[2px_2px_0px_#000] border-2 border-black">
                      <span>C-Rank:</span>
                      <span className="text-emerald-400">{roundedScore}</span>
                      <span className="text-zinc-400 font-normal">/100</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-300/80 font-mono text-xs font-semibold">
                  Unscored
                </span>
              )}

              {repo?.language && (
                <Link
                  href={`/rankings/${getLanguageSlug(repo.language)}`}
                  title={`View Top Welcoming Open-Source ${repo.language} Projects`}
                  className="inline-flex items-center gap-1.5 border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 font-mono text-xs font-semibold rounded-lg text-zinc-700 hover:border-zinc-300 transition-colors"
                >
                  <LangLogo language={repo.language} />
                  <span>{repo.language}</span>
                </Link>
              )}

              <span
                title="Pull requests recorded in telemetry window"
                className="inline-flex items-center gap-1 border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] text-zinc-600 rounded-lg"
              >
                <GitPullRequest className="h-3 w-3 text-blue-600" />
                <span>{typeof repo?.pr_count_6m === "number" ? repo.pr_count_6m : (isScored ? "12+" : "0")} PRs (6m)</span>
              </span>

              <span
                title="Issues recorded in telemetry window"
                className="inline-flex items-center gap-1 border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] text-zinc-600 rounded-lg"
              >
                <CircleDot className="h-3 w-3 text-emerald-600" />
                <span>{typeof repo?.issue_count_6m === "number" ? repo.issue_count_6m : (repo?.good_first_issue_count ? `${repo.good_first_issue_count}+` : "0")} Issues (6m)</span>
              </span>
            </div>

            {/* 3. Repo Description */}
            <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed font-sans line-clamp-2">
              {repo?.description || "Public GitHub repository indexed and scored by maintainer responsiveness for contributor accessibility."}
            </p>
          </div>
        </div>

        {/* Right: Unified, Focused Action Hub */}
        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between sm:justify-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-100">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/compare?a=${encodeURIComponent(fullName)}`}
              title={`Compare ${fullName} with another repository`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold font-sans rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
            >
              <Scale className="h-3.5 w-3.5 text-zinc-500" />
              <span>Compare</span>
            </Link>

            <button
              onClick={onWatchToggle}
              disabled={watchLoading}
              title={isWatching ? "Unwatch repository" : "Watch repository for rank & velocity changes"}
              className={`inline-flex items-center gap-1.5 border rounded-xl px-3.5 py-2 text-xs font-semibold font-sans transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
                isWatching
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50"
              }`}
            >
              {isWatching ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Bookmark className="h-3.5 w-3.5 text-zinc-500" />}
              <span>{isWatching ? "Watching" : "Watch"}</span>
            </button>

            <a
              href={repo?.github_url || `https://github.com/${fullName}`}
              target="_blank"
              rel="nofollow noopener noreferrer"
              title={`View ${fullName} repository on GitHub`}
              onClick={onGithubClick}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold font-sans text-white hover:bg-zinc-800 transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </a>
          </div>

          {onClaimClick && (
            <button
              type="button"
              onClick={onClaimClick}
              title={isVerified ? `Open Maintainer Console for ${fullName}` : `Verify maintainer ownership of ${fullName}`}
              className="text-[11px] font-sans font-medium text-zinc-500 hover:text-zinc-900 transition-colors inline-flex items-center gap-1.5 cursor-pointer underline underline-offset-2"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isVerified ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span>{isVerified ? "Maintainer Console" : "Claim repository"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
