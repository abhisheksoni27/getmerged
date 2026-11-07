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
  layout?: "card" | "row";
}

export function RepoCard({ repo, isSpotlight = false, layout = "card" }: RepoCardProps) {
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

  if (layout === "row") {
    return (
      <a
        href={`/${fullName}`}
        onClick={handleClick}
        title={`View ${fullName} C-Rank scorecard, PR response time & merge metrics`}
        className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-none bg-white p-5 sm:px-6 sm:py-4 border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[7px_7px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all text-current no-underline cursor-pointer"
      >
        {/* Left: Identity & Info */}
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-none border-2 border-black bg-[#F4F4EE] overflow-hidden shrink-0 shadow-[2px_2px_0px_0px_#000] mt-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://github.com/${ownerPart || "github"}.png?size=48`}
              alt={ownerPart}
              width={48}
              height={48}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png?size=48";
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-space text-base sm:text-xl font-black text-black group-hover:bg-[#FACC15] group-hover:px-1 transition-all truncate tracking-tight">
                {displayName}
              </span>
              <span className="text-xs font-mono font-bold text-gray-600 hidden sm:inline truncate max-w-[200px]">
                {fullName}
              </span>
              <CRankBadge rank={rank} size="sm" showLabel={true} />
              {repo.currently_active && (
                <span className="h-2.5 w-2.5 bg-[#10B981] border border-black shrink-0" title="Active in last 30 days" />
              )}
            </div>

            <p className="text-xs sm:text-sm text-black line-clamp-1 mt-1 font-mono font-medium">
              {repo.description || "No repository description available."}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-2 font-mono text-xs">
              <span className="flex items-center gap-1 font-black text-black bg-[#FACC15] px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000]">
                <Star className="h-3.5 w-3.5 fill-black text-black" />
                {repo.stars >= 1_000 ? `${(repo.stars / 1_000).toFixed(1)}k` : repo.stars}
              </span>
              <span className="flex items-center gap-1 text-black bg-white px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000] font-bold">
                <LangLogo language={repo.language} />
                <span>{repo.language || "Code"}</span>
              </span>
              {topicChips.slice(0, 3).map((topic) => (
                <span
                  key={topic}
                  onClick={(e) => handleTopicChipClick(e, topic)}
                  className="hidden lg:inline-flex items-center px-2 py-0.5 border border-black bg-[#F4F4EE] text-black hover:bg-[#FACC15] text-[11px] font-mono font-bold"
                >
                  #{topic}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Telemetry data columns in crisp tabular alignment */}
        <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 pt-3 md:pt-0 border-t-2 md:border-t-0 border-black font-mono">
          {/* Merge Rate */}
          <div className="text-left md:text-right border-2 border-black bg-[#F4F4EE] px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
            <div className="text-[10px] text-black font-black uppercase">Merge rate</div>
            <div className="text-sm sm:text-base font-black text-black tabular-nums">{mergeRateStr}</div>
          </div>

          {/* Review Time */}
          <div className="text-left md:text-right border-2 border-black bg-[#F4F4EE] px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
            <div className="text-[10px] text-black font-black uppercase">Review wait</div>
            <div className="text-sm sm:text-base font-black text-black tabular-nums">{firstResponseStr}</div>
          </div>

          {/* 1st Timers */}
          <div className="text-left md:text-right hidden sm:block border-2 border-black bg-[#F4F4EE] px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
            <div className="text-[10px] text-black font-black uppercase">1st-timers</div>
            <div className="text-sm sm:text-base font-black text-black tabular-nums">{firstTimerStr}</div>
          </div>

          {/* Starter issues pill */}
          {gfiCount > 0 && (
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleGfiClick();
              }}
              className="hidden xl:inline-flex items-center gap-1 text-black bg-[#10B981] px-2.5 py-1.5 border-2 border-black font-black text-xs shadow-[2px_2px_0px_0px_#000] hover:bg-[#FACC15] transition-colors"
              title={`View ${gfiCount} Good First Issues`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{gfiCount} GFI</span>
            </span>
          )}

          {/* Scorecard Action */}
          <div className="pl-1">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border-2 border-black bg-black text-[#FACC15] group-hover:bg-[#FACC15] group-hover:text-black transition-all text-xs font-mono font-black uppercase shadow-[2px_2px_0px_0px_#000]">
              <span>SCORECARD</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={`/${fullName}`}
      onClick={handleClick}
      title={`View ${fullName} C-Rank scorecard, PR response time & merge metrics`}
      className={`group relative flex h-full flex-col justify-between rounded-none bg-white p-6 transition-all duration-100 block text-current no-underline cursor-pointer border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[7px_7px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 ${
        isSpotlight ? "bg-[#FFFDF8]" : ""
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* Top Bar: Identity & Grade Badge */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="h-12 w-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden shrink-0 shadow-2xs">
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
              <div className="font-sans text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5 min-w-0 tracking-tight" title={fullName}>
                <span className="truncate">{displayName}</span>
                <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-primary)] shrink-0" />
              </div>
              <div className="text-xs font-mono text-[var(--text-tertiary)] truncate mt-0.5">
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
                    ? "bg-[#0D9668]"
                    : "bg-[var(--border-strong)]"
                }`}
              />
            )}
            <CRankBadge rank={rank} size="sm" showLabel={true} />
            {repo.low_sample && (
              <span
                title="Low sample size (under 20 PRs in lookback window). Capped at Tier B."
                className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-[#C4910A]/10 text-[#C4910A] border border-[#C4910A]/20"
              >
                Low Sample
              </span>
            )}
          </div>
        </div>

        {/* Sub-meta: Stars & Language */}
        <div className="flex items-center gap-2.5 mb-4 font-mono text-xs">
          <span className="flex items-center gap-1.5 font-bold text-[var(--text-primary)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
            <Star className="h-3.5 w-3.5 fill-[#C4910A] text-[#C4910A]" />
            {repo.stars >= 1_000 ? `${(repo.stars / 1_000).toFixed(1)}k` : repo.stars}
          </span>
          <span className="text-[var(--border-strong)]">·</span>
          <span className="flex items-center gap-1.5 truncate text-[var(--text-primary)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
            <LangLogo language={repo.language} />
            <span className="truncate font-bold">{repo.language || "Code"}</span>
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed font-sans mb-5 min-h-[2.75rem]">
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
              className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-mono text-xs font-medium hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              #{topic}
            </span>
          ))}
          {topicOverflow > 0 && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] font-mono text-xs font-medium shrink-0"
              aria-hidden="true"
            >
              +{topicOverflow}
            </span>
          )}
        </div>

        {/* Telemetry Metrics */}
        <div className="grid grid-cols-3 border-2 border-black bg-[#F4F4EE] divide-x-2 divide-black shadow-[2px_2px_0px_0px_#000] mb-5 p-2">
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
      <div className="pt-4 border-t-2 border-black flex flex-wrap items-center justify-between gap-3 text-xs font-mono font-bold text-black">
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
              className="inline-flex items-center gap-1.5 text-black bg-[#10B981] px-2.5 py-1 border-2 border-black font-black text-xs shadow-[2px_2px_0px_0px_#000] hover:bg-[#FACC15] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>{gfiCount} GFI</span>
            </span>
          ) : repo.is_trending ? (
            <span className="inline-flex items-center gap-1.5 text-black bg-[#FACC15] px-2.5 py-1 border-2 border-black font-black text-xs shadow-[2px_2px_0px_0px_#000] shrink-0 whitespace-nowrap">
              <Flame className="h-3.5 w-3.5 shrink-0" />
              <span>TRENDING</span>
            </span>
          ) : (
            <span className="text-black text-xs font-mono font-bold">● SCORED</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="compare-btn"
            aria-label={`Compare ${fullName} against another repo`}
            title={`Compare ${fullName} with other repos`}
            onClick={handleCompareClick}
            onKeyDown={handleCompareKeyDown}
            className="inline-flex items-center gap-1.5 border border-black bg-white px-2 py-1 text-black font-mono font-bold shadow-[1px_1px_0px_0px_#000] hover:bg-[#FACC15] transition-colors cursor-pointer text-xs"
          >
            <Scale className="h-3 w-3" />
            <span>VS</span>
          </button>
          <span className="inline-flex items-center gap-1 bg-black text-[#FACC15] border border-black px-2.5 py-1 font-mono font-black uppercase text-xs shadow-[1px_1px_0px_0px_#000]">
            <span>SCORECARD →</span>
          </span>
        </div>
      </div>
    </a>
  );
}
