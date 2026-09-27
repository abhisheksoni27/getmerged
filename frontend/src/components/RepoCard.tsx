"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Repo } from "@/types/opendoor";
import { Star, ArrowUpRight, ShieldCheck, Scale, Flame, ArrowRight } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";
import { CRankBadge } from "@/components/CRankBadge";
import { MetricGauge } from "@/components/MetricGauge";
import posthog from "posthog-js";

interface RepoCardProps {
  repo: Repo;
  isLoggedIn?: boolean;
  isSpotlight?: boolean;
  spotlightIndex?: number;
}

export function RepoCard({ repo, isSpotlight = false }: RepoCardProps) {
  const router = useRouter();
  const rank = repo.class_rank || repo.c_rank_tier || "A";
  
  // Extract owner and repository name cleanly
  const fullName = repo.full_name || (repo.owner && repo.name ? `${repo.owner}/${repo.name}` : repo.name || "");
  const [ownerPart, namePart] = fullName.includes("/")
    ? fullName.split("/")
    : [repo.owner || "", repo.name || fullName];

  const displayName = repo.name && repo.name !== fullName ? repo.name : namePart || fullName;

  const mergeRateVal = repo.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate > 0
    ? Math.round(repo.external_pr_merge_rate)
    : null;
  const mergeRateStr = mergeRateVal !== null ? `${mergeRateVal}%` : " - ";

  const firstResponseHours = repo.time_to_first_response_hours;
  const firstResponseStr =
    firstResponseHours && firstResponseHours > 0
      ? firstResponseHours < 1
        ? "<1h"
        : firstResponseHours < 24
        ? `${Math.round(firstResponseHours)}h`
        : `${Math.round(firstResponseHours / 24)}d`
      : " - ";

  const responsePercentage = firstResponseHours
    ? Math.max(0, Math.min(100, Math.round(100 - (firstResponseHours / 72) * 80)))
    : 0;

  const firstTimerRateVal = repo.first_timer_success_rate !== undefined && repo.first_timer_success_rate >= 0
    ? Math.round(repo.first_timer_success_rate)
    : null;
  const firstTimerStr = firstTimerRateVal !== null ? `${firstTimerRateVal}%` : " - ";

  const gfiCount = repo.good_first_issue_count ?? 0;
  const gfiLabel = gfiCount === 1 ? "1 good first issue" : `${gfiCount} good first issues`;
  const gfiIssuesUrl = `https://github.com/${fullName}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`;

  const handleGfiClick = () => {
    posthog.capture("gfi_badge_clicked", {
      repo_full_name: fullName,
      source: "repo_card",
    });
    window.open(gfiIssuesUrl, "_blank", "noopener,noreferrer");
  };

  const handleGfiKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      handleGfiClick();
    }
  };

  const handleTopicChipClick = (e: React.MouseEvent, topic: string) => {
    e.preventDefault();
    e.stopPropagation();
    posthog.capture("repo_card_topic_clicked", {
      topic,
      repo_full_name: fullName,
    });
    router.push(`/topics/${encodeURIComponent(topic)}`);
  };

  const handleTopicChipKeyDown = (e: React.KeyboardEvent, topic: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      posthog.capture("repo_card_topic_clicked", {
        topic,
        repo_full_name: fullName,
      });
      router.push(`/topics/${encodeURIComponent(topic)}`);
    }
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    posthog.capture("compare_mode_opened", {
      source: "repo_card",
      primary_repo: fullName,
    });
    router.push(`/compare/${fullName}`);
  };

  const handleCompareKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      posthog.capture("compare_mode_opened", {
        source: "repo_card",
        primary_repo: fullName,
      });
      router.push(`/compare/${fullName}`);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!e.defaultPrevented) {
      posthog.capture("repo_clicked", {
        repo_name: fullName,
        rank: repo.class_rank || repo.c_rank_tier || "unranked",
        stars: repo.stars,
        language: repo.language,
        is_spotlight: isSpotlight,
      });
    }
  };

  const topicChips = (repo.topics || []).filter(Boolean).slice(0, 3);
  const topicOverflow = (repo.topics || []).length - topicChips.length;

  return (
    <a
      href={`/${fullName}`}
      onClick={handleClick}
      title={`View ${fullName} C-Rank scorecard, PR response time & merge metrics`}
      className={`group card-specular-bevel relative flex h-full flex-col justify-between rounded-xl bg-[#141414]/70 backdrop-blur-md p-6 transition-all duration-200 block text-current no-underline cursor-pointer border border-white/[0.08] hover:border-white/[0.22] hover:bg-[#1a1a1a]/90 hover:shadow-[0_12px_36px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:-translate-y-0.5 ${
        isSpotlight
          ? "ring-1 ring-[#ff6b00]/50 border-[#ff6b00]/30 shadow-[0_0_24px_rgba(255,107,0,0.1)]"
          : "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* Top Bar: Identity & Grade Badge */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="h-12 w-12 rounded-lg border border-white/[0.08] bg-[#1c1c1c] overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://github.com/${ownerPart || "github"}.png?size=48`}
                srcSet={`https://github.com/${ownerPart || "github"}.png?size=48 1x, https://github.com/${ownerPart || "github"}.png?size=96 2x`}
                alt={ownerPart}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png?size=48";
                  (e.currentTarget as HTMLImageElement).srcset = "";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-sans text-lg sm:text-xl font-bold text-white group-hover:text-[#ff6b00] transition-colors flex items-center gap-1.5 min-w-0 tracking-tight" title={fullName}>
                <span className="truncate">{displayName}</span>
                <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#ff6b00] shrink-0" />
              </div>
              <div className="text-xs font-mono text-[#737373] truncate mt-0.5">
                {fullName}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {repo.currently_active !== undefined && (
              <span
                title={repo.currently_active ? "Active in last 30 days" : "No PR activity in last 30 days"}
                className={`h-2 w-2 rounded-full shrink-0 ${
                  repo.currently_active
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                    : "bg-zinc-600"
                }`}
              />
            )}
            <CRankBadge rank={rank} size="sm" showLabel={true} />
            {repo.low_sample && (
              <span
                title="Low sample size (under 20 PRs in lookback window). Capped at Tier B."
                className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
              >
                Low Sample
              </span>
            )}
          </div>
        </div>

        {/* Sub-meta: Stars & Language */}
        <div className="flex items-center gap-3 mb-4 font-mono text-xs">
          <span className="flex items-center gap-1.5 font-bold text-white bg-[#1c1c1c] px-2.5 py-1 rounded-lg border border-white/[0.08]">
            <Star className="h-3.5 w-3.5 fill-[#fbbf24] text-[#fbbf24]" />
            {repo.stars >= 1_000 ? `${(repo.stars / 1_000).toFixed(1)}k` : repo.stars}
          </span>
          <span className="text-[#525252]">·</span>
          <span className="flex items-center gap-1.5 truncate text-white bg-[#1c1c1c] px-2.5 py-1 rounded-lg border border-white/[0.08]">
            <LangLogo language={repo.language} />
            <span className="truncate font-bold">{repo.language || "Code"}</span>
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-[#a3a3a3] line-clamp-2 leading-relaxed font-sans mb-5 min-h-[2.75rem]">
          {repo.description || "No repository description available."}
        </p>

        {/* Topic tags */}
        <div className="h-7 flex items-center gap-2 overflow-hidden mb-5">
          {topicChips.map((topic) => (
            <span
              key={topic}
              role="button"
              tabIndex={0}
              data-testid="topic-chip"
              aria-label={`Filter by topic ${topic}`}
              title={`Explore ${topic} repositories`}
              onClick={(e) => handleTopicChipClick(e, topic)}
              onKeyDown={(e) => handleTopicChipKeyDown(e, topic)}
              className="inline-flex items-center px-3 py-1 rounded-lg bg-[#1c1c1c] text-[#d4d4d4] border border-white/[0.08] font-mono text-xs font-semibold hover:bg-[#262626] hover:text-white hover:border-white/[0.16] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              #{topic}
            </span>
          ))}
          {topicOverflow > 0 && (
            <span
              className="inline-flex items-center px-2 py-1 rounded-lg bg-[#141414] text-[#737373] border border-white/[0.04] font-mono text-xs font-medium shrink-0"
              aria-hidden="true"
            >
              +{topicOverflow}
            </span>
          )}
        </div>

        {/* Telemetry Metrics */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 p-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.04] mb-5">
          <MetricGauge
            label="Merge Rate"
            value={mergeRateStr}
            percentage={mergeRateVal || 0}
            tier={rank}
          />
          <MetricGauge
            label="Review Time"
            value={firstResponseStr}
            percentage={responsePercentage}
            tier={rank}
          />
          <MetricGauge
            label="1st-Timers"
            value={firstTimerStr}
            percentage={firstTimerRateVal || 0}
            tier={rank}
          />
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#a3a3a3]">
        <div className="flex items-center gap-2 min-w-0">
          {gfiCount > 0 ? (
            <span
              role="button"
              tabIndex={0}
              data-testid="gfi-badge"
              aria-label={`View ${gfiLabel} on ${fullName}`}
              title={`View open good first issues on ${fullName}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleGfiClick();
              }}
              onKeyDown={handleGfiKeyDown}
              className="inline-flex items-center gap-1.5 text-[#10b981] bg-[#10b981]/10 px-3 py-1 rounded-lg border border-[#10b981]/20 font-bold text-xs hover:bg-[#10b981]/20 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>{gfiCount} GFI</span>
            </span>
          ) : repo.is_trending ? (
            <span className="inline-flex items-center gap-1.5 text-[#ff6b00] bg-[#ff6b00]/10 px-3 py-1 rounded-lg border border-[#ff6b00]/20 font-bold text-xs shrink-0 whitespace-nowrap">
              <Flame className="h-3.5 w-3.5 shrink-0" />
              <span>Trending</span>
            </span>
          ) : (
            <span className="text-[#737373] text-xs font-medium">Tracked</span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            data-testid="compare-btn"
            aria-label={`Compare ${fullName} against another repo`}
            title={`Compare ${fullName} with other repos`}
            onClick={handleCompareClick}
            onKeyDown={handleCompareKeyDown}
            className="inline-flex items-center gap-1.5 text-[#a3a3a3] hover:text-white px-2.5 py-1 rounded-lg hover:bg-[#1c1c1c] transition-colors cursor-pointer text-xs font-semibold"
          >
            <Scale className="h-3.5 w-3.5" />
            <span>Compare</span>
          </button>
          <span className="inline-flex items-center gap-1 text-[#ff6b00] font-bold hover:text-[#ff8a33] transition-colors text-xs">
            <span>Scorecard</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </a>
  );
}
