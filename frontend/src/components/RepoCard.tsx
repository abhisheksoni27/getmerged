"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Repo } from "@/types/opendoor";
import { Star, ArrowUpRight, ShieldCheck, Scale, Flame } from "lucide-react";
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

  const handleClick = () => {
    posthog.capture("repo_card_clicked", {
      repo_full_name: repo.full_name,
      repo_language: repo.language,
      repo_tier: rank,
      repo_stars: repo.stars,
    });
  };

  const handleTopicChipClick = (e: React.MouseEvent, topic: string) => {
    e.preventDefault();
    e.stopPropagation();
    posthog.capture("topic_chip_clicked", {
      topic,
      repo_full_name: repo.full_name,
    });
    router.push(`/topics/${encodeURIComponent(topic)}`);
  };

  const handleTopicChipKeyDown = (e: React.KeyboardEvent, topic: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/topics/${encodeURIComponent(topic)}`);
    }
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    posthog.capture("compare_cta_clicked", {
      repo_full_name: repo.full_name,
      source: "repo_card",
    });
    router.push(`/compare?a=${encodeURIComponent(repo.full_name)}`);
  };

  const handleCompareKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/compare?a=${encodeURIComponent(repo.full_name)}`);
    }
  };

  const topicChips = (repo.topics || []).filter(Boolean).slice(0, 3);
  const topicOverflow = (repo.topics || []).length - topicChips.length;

  return (
    <a
      href={`/${ownerPart}/${namePart}`}
      onClick={handleClick}
      title={`View ${repo.full_name} C-Rank scorecard, PR response time & merge metrics`}
      className={`group glass-card relative flex h-full flex-col justify-between rounded-2xl p-6 transition-all duration-300 block text-current no-underline cursor-pointer ${
        isSpotlight
          ? "ring-1 ring-orange-500/30 shadow-[0_0_24px_rgba(255,107,0,0.08)]"
          : ""
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* Top Bar: Identity & Grade Badge */}
        <div className="flex items-start justify-between gap-4 mb-3.5">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-xl border border-white/[0.08] bg-zinc-900 overflow-hidden shrink-0 group-hover:border-white/[0.2] transition-colors shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://github.com/${ownerPart}.png?size=64`}
                alt={ownerPart}
                width={40}
                height={40}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png?size=64";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-sans text-[15px] font-semibold text-zinc-100 group-hover:text-white transition-colors flex items-center gap-1 min-w-0 tracking-tight" title={repo.full_name}>
                <span className="truncate">{repo.name}</span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 shrink-0" />
              </div>
              <div className="text-xs font-mono text-zinc-400 truncate mt-0.5">
                {repo.full_name}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <CRankBadge rank={rank} size="sm" showLabel={true} />
          </div>
        </div>

        {/* Sub-meta: Stars & Language */}
        <div className="flex items-center gap-3 mb-3.5 font-mono text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 font-medium text-zinc-300">
            <Star className="h-3.5 w-3.5 fill-amber-400/90 text-amber-400" />
            {repo.stars >= 1_000 ? `${(repo.stars / 1_000).toFixed(1)}k` : repo.stars}
          </span>
          <span className="text-zinc-700">•</span>
          <span className="flex items-center gap-1.5 truncate text-zinc-300">
            <LangLogo language={repo.language} />
            <span className="truncate">{repo.language || "Code"}</span>
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-sans mb-4 h-9">
          {repo.description || "No repository description available."}
        </p>

        {/* Topic tags */}
        <div className="h-6 flex items-center gap-1.5 overflow-hidden mb-4">
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
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.06] font-mono text-[10px] font-medium hover:bg-white/[0.08] hover:text-zinc-200 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              #{topic}
            </span>
          ))}
          {topicOverflow > 0 && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/[0.03] text-zinc-500 border border-white/[0.05] font-mono text-[10px] font-medium shrink-0"
              aria-hidden="true"
            >
              +{topicOverflow}
            </span>
          )}
        </div>

        {/* Telemetry Precision Well */}
        <div className="grid grid-cols-3 gap-2 py-2 px-1 bg-black/40 rounded-xl border border-white/[0.06] mb-4 shadow-inner">
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
      <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-400">
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
              className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium text-[11px] hover:bg-emerald-500/20 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />
              <span>{gfiCount} GFI</span>
            </span>
          ) : repo.is_trending ? (
            <span className="inline-flex items-center gap-1 text-orange-400 font-medium shrink-0 whitespace-nowrap text-[11px]">
              <Flame className="h-3 w-3 fill-orange-500 text-orange-500 shrink-0" />
              <span>Trending</span>
            </span>
          ) : (
            <span className="text-zinc-400 shrink-0 whitespace-nowrap text-[11px]">Tracked</span>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          <span
            role="button"
            tabIndex={0}
            data-testid="compare-cta"
            title={`Compare ${repo.full_name} with another repository`}
            aria-label={`Compare ${repo.full_name}`}
            onClick={handleCompareClick}
            onKeyDown={handleCompareKeyDown}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-0.5 rounded-md border border-white/[0.06] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Scale className="h-3 w-3 shrink-0" />
            <span>Compare</span>
          </span>
          <span className="font-semibold text-orange-400 group-hover:text-orange-300 flex items-center gap-0.5 text-xs shrink-0 whitespace-nowrap transition-colors">
            Details ↗
          </span>
        </div>
      </div>
    </a>
  );
}
