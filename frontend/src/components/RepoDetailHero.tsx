"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  ExternalLink,
  Star,
  Scale,
  CircleDot,
  Check,
  Share2,
  Copy,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { getLanguageSlug } from "@/lib/languageSlug";
import { Repo } from "@/types/opendoor";
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
  onDisputeClick?: () => void;
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
  isVerified,
  onClaimClick,
  onDisputeClick,
  onWatchToggle,
  onGithubClick,
}: RepoDetailHeroProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const roundedScore = Number(score.toFixed(1));
  const isScored = repo?.is_scored ?? (score > 0);
  const busFactor = repo?.bus_factor ?? 0;
  const isBusFactorCapped = isScored && rank?.toUpperCase() === "B" && roundedScore >= 55 && busFactor <= 1;

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
    const url = encodeURIComponent(
      typeof window !== "undefined" ? window.location.href : `https://getmerged.abhishekco.de/${fullName}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener,noreferrer");
    posthog.capture("repo_shared_twitter", { repo_full_name: fullName, tier: rank });
  };

  // Generate empirical verdict text
  const mergeRateVal = repo?.external_pr_merge_rate ? `${Math.round(repo.external_pr_merge_rate)}%` : "high";
  const responseTimeVal =
    repo?.time_to_first_response_hours !== undefined
      ? repo.time_to_first_response_hours < 1
        ? `${Math.round(repo.time_to_first_response_hours * 60)} minutes`
        : `${repo.time_to_first_response_hours.toFixed(1)} hours`
      : "fast";

  let verdictSummary = "Active candidate for outside pull requests.";
  if (rank === "S") {
    verdictSummary = "Exceptional candidate for your first PR. Outside contributors get rapid maintainer reviews and high acceptance.";
  } else if (rank === "A") {
    verdictSummary = "Highly receptive maintainers with consistent review turnaround and reliable acceptance for clean diffs.";
  } else if (rank === "B") {
    verdictSummary = "Solid welcoming repository. Maintainers regularly merge well-scoped outside pull requests.";
  } else if (rank === "C" || rank === "D") {
    verdictSummary = "Higher review latency observed. Ensure issues are pre-discussed before opening substantive PRs.";
  }

  const activeDaysAgo = repo?.last_activity_days
    ? `${Math.round(repo.last_activity_days)}d ago`
    : repo?.currently_active
    ? "Active recently"
    : "Active (30d)";

  return (
    <div className="card card-highlight p-6 sm:p-7 mb-6">
      <div className="flex flex-col lg:flex-row gap-6 lg:items-start justify-between">
        {/* Left Block: Letter Grade Block + Narrative Info */}
        <div className="flex flex-col sm:flex-row gap-5 items-start flex-1 min-w-0">
          {/* Beat 1: Precision Letter Grade Block */}
          <div className="flex flex-col items-center justify-center min-w-[110px] sm:min-w-[124px] py-4 px-3 bg-[#0D111A] border border-[var(--border-accent)] rounded-lg shadow-[0_0_20px_var(--purple-glow)] shrink-0 self-stretch sm:self-auto">
            <div
              className={`font-mono text-5xl font-bold leading-none ${
                rank === "S"
                  ? "text-[var(--purple-bright)]"
                  : rank === "A"
                  ? "text-[var(--green-bright)]"
                  : rank === "B"
                  ? "text-[var(--accent-warning)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {rank || " - "}
            </div>
            <div className="text-[11px] font-semibold font-mono text-[var(--text-tertiary)] mt-2">
              SCORE {roundedScore}
            </div>
            {isBusFactorCapped && (
              <span
                title={`Safety-capped at B (solo maintainer, bus factor: ${busFactor})`}
                className="mt-1 text-[10px] font-mono text-[var(--accent-warning)]"
              >
                BUS CAPPED
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            {/* Meta Tags Row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span
                className={`pill ${
                  rank === "S" || rank === "A" ? "pill-green" : rank === "B" ? "pill-purple" : ""
                }`}
              >
                ★ {rankLabel || "Scored"}
              </span>

              {repo?.language && (
                <Link
                  prefetch={false}
                  href={`/rankings/${getLanguageSlug(repo.language)}`}
                  className="pill hover:border-[var(--border-hover)] transition-colors"
                >
                  {repo.language}
                </Link>
              )}

              {repo?.stars !== undefined && (
                <span className="pill">
                  <Star className="h-3 w-3 fill-[#C4910A] text-[#C4910A]" />
                  <span className="tabular">{repo.stars.toLocaleString()} stars</span>
                </span>
              )}

              <span className="pill">{activeDaysAgo}</span>

              {isVerified && (
                <span className="pill pill-green">
                  <Check className="h-3 w-3" />
                  Verified
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[var(--text-primary)] mb-2 truncate">
              {fullName}
            </h1>

            {/* Narrative Verdict Paragraph */}
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              <strong className="text-[var(--text-primary)]">Verdict: {verdictSummary}</strong>{" "}
              Outside contributors observe a median review response in{" "}
              <span className="font-mono text-[var(--text-primary)] font-medium">{responseTimeVal}</span>, and{" "}
              <span className="font-mono text-[var(--text-primary)] font-medium">{mergeRateVal}</span> of outside PRs
              are merged into main.
            </p>
          </div>
        </div>

        {/* Right Block: Action Buttons Toolbar */}
        <div className="flex flex-wrap lg:flex-col items-stretch gap-2 shrink-0 pt-2 lg:pt-0">
          <div className="flex items-center gap-2 w-full">
            <a
              href={`https://github.com/${fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onGithubClick}
              title={`View ${fullName} on GitHub`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[var(--text-primary)] hover:bg-[var(--color-neutral-800)] text-[var(--bg-canvas)] font-mono text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              type="button"
              onClick={onWatchToggle}
              disabled={watchLoading}
              title={isWatching ? "Remove from watchlist" : "Add to watchlist"}
              className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md border font-mono text-xs font-medium transition-colors cursor-pointer ${
                isWatching
                  ? "bg-[var(--purple-bright)]/15 text-[var(--purple-bright)] border-[var(--border-accent)]"
                  : "bg-[#0D111A] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isWatching ? "fill-current" : ""}`} />
              <span>{isWatching ? "Saved" : "Watch"}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={handleShareX}
              title="Share on X"
              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-[#0D111A] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-mono text-xs transition-colors cursor-pointer"
            >
              <Share2 className="h-3 w-3 text-[#58A6FF]" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={handleCopyBadge}
              title="Copy Markdown badge"
              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-[#0D111A] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-mono text-xs transition-colors cursor-pointer"
            >
              {copiedBadge ? <Check className="h-3 w-3 text-[var(--green-bright)]" /> : <Shield className="h-3 w-3 text-[var(--accent-warning)]" />}
              <span>{copiedBadge ? "Copied" : "Badge"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy page link"
              className="inline-flex items-center justify-center px-2 py-1.5 rounded-md bg-[#0D111A] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-mono text-xs transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="h-3 w-3 text-[var(--green-bright)]" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

          {/* Compare, Claim, Dispute Links */}
          <div className="flex items-center justify-end gap-2 text-[11px] font-mono text-[var(--text-tertiary)] mt-1">
            <Link
              prefetch={false}
              href={`/compare?a=${encodeURIComponent(fullName)}`}
              className="hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1"
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
                  className="hover:text-[var(--purple-bright)] transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <CircleDot className="h-3 w-3" />
                  <span>Claim</span>
                </button>
              </>
            )}
            {onDisputeClick && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={onDisputeClick}
                  className="hover:text-[var(--accent-warning)] transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <ShieldAlert className="h-3 w-3" />
                  <span>Dispute</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
