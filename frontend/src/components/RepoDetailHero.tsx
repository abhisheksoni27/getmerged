import React, { useState } from "react";
import Link from "next/link";
import { Bookmark, GitPullRequest, Star, Scale, CircleDot, Check, Share2, Copy, Shield } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";
import { getLanguageSlug } from "@/lib/languageSlug";
import { Repo } from "@/types/opendoor";
import { CRankBadge } from "@/components/CRankBadge";
import posthog from "posthog-js";

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const owner = repo?.owner || fullName.split("/")[0];
  const ownerAvatarUrl = `https://github.com/${owner}.png?size=64`;
  const roundedScore = Math.round(score);
  const isScored = repo?.is_scored ?? (score > 0);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      posthog.capture("repo_share_link_copied", { repo_full_name: fullName });
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyBadge = () => {
    if (typeof window !== "undefined") {
      const badgeCode = `[![GetMerged C-Rank](https://getmerged.abhishekco.de/api/badge/${fullName})](https://getmerged.abhishekco.de/${fullName})`;
      navigator.clipboard.writeText(badgeCode);
      setCopiedBadge(true);
      posthog.capture("repo_badge_copied", { repo_full_name: fullName, tier: rank });
      setTimeout(() => setCopiedBadge(false), 2500);
    }
  };

  const handleShareX = () => {
    const text = encodeURIComponent(
      `Check out ${fullName} on @GetMerged! C-Rank™ Grade: ${rank} (${roundedScore}/100) with empirical PR merge rate telemetry.\n\n`
    );
    const url = encodeURIComponent(typeof window !== "undefined" ? window.location.href : `https://getmerged.abhishekco.de/${fullName}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener,noreferrer");
    posthog.capture("repo_shared_twitter", { repo_full_name: fullName, tier: rank });
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Identity & Metadata */}
        <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ownerAvatarUrl}
            alt={owner}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-white/[0.1] glass-card shrink-0 object-cover shadow-inner mt-1"
          />

          <div className="flex-1 min-w-0">
            {/* Title & Stars */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-space truncate">
                {fullName}
              </h1>
              {repo?.stars !== undefined && (
                <div className="flex items-center gap-1 text-zinc-300 text-xs font-mono">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{repo.stars.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Badges Row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {isScored ? (
                <>
                  <CRankBadge rank={rank} size="sm" showLabel />
                  {roundedScore > 0 && (
                    <span className="text-xs font-mono text-zinc-300">
                      ({roundedScore}/100)
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] text-zinc-300 border border-white/[0.09] font-mono text-xs">
                  Unscored
                </span>
              )}

              {repo?.language && (
                <Link
                  href={`/rankings/${getLanguageSlug(repo.language)}`}
                  title={`View top ranked ${repo.language} repositories`}
                  className="inline-flex items-center gap-1.5 border border-white/[0.1] bg-white/[0.04] px-3 py-1 font-mono text-xs font-medium rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
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
            <p className="mt-3 text-sm text-zinc-300 leading-relaxed font-sans max-w-3xl">
              {repo?.description || "Open-source repository analyzed with precision C-Rank telemetry."}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 lg:flex-col lg:items-end">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={onWatchToggle}
              disabled={watchLoading}
              title={isWatching ? "Remove from watchlist" : "Add to watchlist"}
              className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-mono font-semibold rounded-xl border transition-all cursor-pointer ${
                isWatching
                  ? "bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25"
                  : "bg-white/[0.04] text-zinc-300 border-white/[0.1] hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isWatching ? "fill-orange-400 text-orange-400" : ""}`} />
              <span>{isWatching ? "Watchlisted" : "Watchlist"}</span>
            </button>

            <button
              type="button"
              onClick={handleShareX}
              title="Share scorecard on X / Twitter"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-xl bg-white/[0.04] text-zinc-300 border border-white/[0.1] hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-[#38bdf8]" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={handleCopyBadge}
              title="Copy Markdown badge embed code for GitHub README"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-xl bg-white/[0.04] text-zinc-300 border border-white/[0.1] hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              {copiedBadge ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Shield className="h-3.5 w-3.5 text-amber-400" />}
              <span>{copiedBadge ? "Badge Copied!" : "Badge"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy link to scorecard"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-xl bg-white/[0.04] text-zinc-300 border border-white/[0.1] hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? "Copied" : "Link"}</span>
            </button>

            <button
              type="button"
              onClick={onGithubClick}
              title={`View ${fullName} on GitHub`}
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-mono font-semibold rounded-xl glass-card text-white hover:bg-zinc-200 transition-all shadow-sm cursor-pointer"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
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
