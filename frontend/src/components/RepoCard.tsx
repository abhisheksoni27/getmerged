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
  const [ownerPart, namePart] = repo.full_name ? repo.full_name.split("/") : [repo.owner || "", repo.name || ""];

  const mergeRateVal = repo.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate > 0
    ? Math.round(repo.external_pr_merge_rate)
    : null;
  const mergeRateStr = mergeRateVal !== null ? `${mergeRateVal}%` : "—";

  const firstResponseHours = repo.time_to_first_response_hours;
  const firstResponseStr =
    firstResponseHours && firstResponseHours > 0
      ? firstResponseHours < 1
        ? "<1h"
        : firstResponseHours < 24
        ? `${Math.round(firstResponseHours)}h`
        : `${Math.round(firstResponseHours / 24)}d`
      : "—";

  const responsePercentage = firstResponseHours
    ? Math.max(0, Math.min(100, Math.round(100 - (firstResponseHours / 72) * 80)))
    : 0;

  const firstTimerRateVal = repo.first_timer_success_rate !== undefined && repo.first_timer_success_rate >= 0
    ? Math.round(repo.first_timer_success_rate)
    : null;
  const firstTimerStr = firstTimerRateVal !== null ? `${firstTimerRateVal}%` : "—";

  const gfiCount = repo.good_first_issue_count ?? 0;
  const gfiLabel = gfiCount === 1 ? "1 good first issue" : `${gfiCount} good first issues`;
  const gfiIssuesUrl = `https://github.com/${repo.full_name}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`;

  const handleGfiClick = () => {
    posthog.capture("gfi_badge_clicked", {
      repo_full_name: repo.full_name,
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
      repo_full_name: repo.full_name,
    });
    router.push(`/topics/${encodeURIComponent(topic)}`);
  };

  const handleTopicChipKeyDown = (e: React.KeyboardEvent, topic: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      posthog.capture("repo_card_topic_clicked", {
        topic,
        repo_full_name: repo.full_name,
      });
      router.push(`/topics/${encodeURIComponent(topic)}`);
    }
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    posthog.capture("compare_mode_opened", {
      source: "repo_card",
      primary_repo: repo.full_name,
    });
    router.push(`/compare/${repo.full_name}`);
  };

  const handleCompareKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      posthog.capture("compare_mode_opened", {
        source: "repo_card",
        primary_repo: repo.full_name,
      });
      router.push(`/compare/${repo.full_name}`);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!e.defaultPrevented) {
      posthog.capture("repo_clicked", {
        repo_name: repo.full_name,
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
      href={`/${ownerPart}/${namePart}`}
      onClick={handleClick}
      title={`View ${repo.full_name} C-Rank scorecard, PR response time & merge metrics`}
      className={`group glass-card relative flex h-full flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all duration-300 block text-current no-underline cursor-pointer border border-white/[0.12] hover:border-white/[0.24] hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)] ${
        isSpotlight
          ? "ring-1 ring-orange-500/40 shadow-[0_0_24px_rgba(255,107,0,0.12)]"
          : ""
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* Top Bar: Identity & Grade Badge */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="h-11 w-11 rounded-2xl border border-white/[0.12] bg-zinc-900 overflow-hidden shrink-0 group-hover:border-white/[0.3] transition-colors shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://github.com/${ownerPart}.png?size=80`}
                alt={ownerPart}
                width={44}
                height={44}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png?size=80";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-space text-base sm:text-lg font-bold text-white group-hover:text-orange-400 transition-colors flex items-center gap-1.5 min-w-0 tracking-tight" title={repo.full_name}>
                <span className="truncate">{repo.name}</span>
                <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 shrink-0" />
              </div>
              <div className="text-xs font-mono text-zinc-300 truncate mt-0.5">
                {repo.full_name}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <CRankBadge rank={rank} size="sm" showLabel={true} />
          </div>
        </div>

        {/* Sub-meta: Stars & Language */}
        <div className="flex items-center gap-3 mb-4 font-mono text-xs text-zinc-300">
          <span className="flex items-center gap-1.5 font-bold text-white bg-white/[0.06] px-2.5 py-1 rounded-lg border border-white/[0.08]">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {repo.stars >= 1_000 ? `${(repo.stars / 1_000).toFixed(1)}k` : repo.stars}
          </span>
          <span className="text-zinc-600">•</span>
          <span className="flex items-center gap-1.5 truncate text-zinc-200 bg-white/[0.06] px-2.5 py-1 rounded-lg border border-white/[0.08]">
            <LangLogo language={repo.language} />
            <span className="truncate font-semibold">{repo.language || "Code"}</span>
          </span>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 leading-relaxed font-sans mb-4.5 min-h-[2.75rem]">
          {repo.description || "No repository description available."}
        </p>

        {/* Topic tags */}
        <div className="h-6 flex items-center gap-1.5 overflow-hidden mb-5">
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
              className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/[0.06] text-zinc-300 border border-white/[0.08] font-mono text-[11px] font-semibold hover:bg-white/[0.12] hover:text-white hover:border-white/[0.2] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              #{topic}
            </span>
          ))}
          {topicOverflow > 0 && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-lg bg-white/[0.04] text-zinc-300 border border-white/[0.06] font-mono text-[11px] font-medium shrink-0"
              aria-hidden="true"
            >
              +{topicOverflow}
            </span>
          )}
        </div>

        {/* Telemetry Precision Well */}
        <div className="grid grid-cols-3 gap-2.5 p-2 rounded-2xl bg-black/60 border border-white/[0.08] mb-5 shadow-inner">
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
      <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-300">
        <div className="flex items-center gap-2 min-w-0">
          {gfiCount > 0 ? (
            <span
              role="button"
              tabIndex={0}
              data-testid="gfi-badge"
              aria-label={`View ${gfiLabel} on ${repo.full_name}`}
              title={`View open good first issues on ${repo.full_name}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleGfiClick();
              }}
              onKeyDown={handleGfiKeyDown}
              className="inline-flex items-center gap-1.5 text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 font-bold text-xs hover:bg-emerald-500/25 transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>{gfiCount} GFI</span>
            </span>
          ) : repo.is_trending ? (
            <span className="inline-flex items-center gap-1.5 text-orange-300 bg-orange-500/15 px-3 py-1 rounded-full border border-orange-500/30 font-bold text-xs shrink-0 whitespace-nowrap shadow-xs">
              <Flame className="h-3.5 w-3.5 shrink-0 text-orange-400" />
              <span>Trending</span>
            </span>
          ) : (
            <span className="text-zinc-400 text-xs font-medium">Telemetry Tracked</span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            data-testid="compare-btn"
            aria-label={`Compare ${repo.full_name} against another repo`}
            title={`Compare ${repo.full_name} with other repos`}
            onClick={handleCompareClick}
            onKeyDown={handleCompareKeyDown}
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer text-xs font-semibold"
          >
            <Scale className="h-3.5 w-3.5 text-zinc-300" />
            <span>Compare</span>
          </button>
          <span className="inline-flex items-center gap-1 text-orange-400 font-bold hover:text-orange-300 transition-colors text-xs">
            <span>Scorecard</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </a>
  );
}
