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

  // Response score (e.g. <24h is 100%, 48h is 80%, etc.)
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
      className={`group dev-card-glow relative flex h-full flex-col justify-between rounded-md p-5 bg-[#111827] border border-slate-800 transition-all duration-120 block text-current no-underline cursor-pointer ${
        isSpotlight
          ? "border-t-2 border-t-orange-500 hover:border-slate-400"
          : "border-t-2 border-t-slate-700 hover:border-slate-400"
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* Header: Name + Right-Aligned C-Rank Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-md border border-slate-700 bg-slate-800 overflow-hidden shrink-0 group-hover:border-slate-500 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://github.com/${ownerPart}.png?size=64`}
                alt={ownerPart}
                width={36}
                height={36}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png?size=64";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-sans text-sm font-semibold text-slate-100 group-hover:text-orange-400 transition-colors flex items-center gap-1 min-w-0" title={repo.full_name}>
                <span className="truncate">{repo.name}</span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 shrink-0" />
              </div>
              <div className="text-[12px] font-mono text-slate-400 truncate">
                {repo.full_name}
              </div>
            </div>
          </div>

          {/* C-Rank Badge */}
          <div className="shrink-0">
            <CRankBadge rank={rank} size="md" showLabel={true} />
          </div>
        </div>

        {/* Subheader: Stars & Language */}
        <div className="flex items-center gap-3 mb-3 font-mono text-[12px] text-slate-400">
          <span className="flex items-center gap-1 font-semibold text-slate-200">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {repo.stars >= 1_000 ? `${(repo.stars / 1_000).toFixed(1)}k` : repo.stars}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 truncate text-slate-300">
            <LangLogo language={repo.language} />
            <span className="truncate">{repo.language || "Code"}</span>
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans mb-4 h-9">
          {repo.description || "No repository description available."}
        </p>

        {/* Topic chips */}
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
              className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px] font-medium hover:border-slate-500 hover:text-white transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              #{topic}
            </span>
          ))}
          {topicOverflow > 0 && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 font-mono text-[10px] font-medium shrink-0"
              aria-hidden="true"
            >
              +{topicOverflow}
            </span>
          )}
        </div>

        {/* Precision Metrics Row: 3 Gauge items */}
        <div className="grid grid-cols-3 gap-2 py-2 px-1 bg-slate-900/90 rounded border border-slate-800 mb-4">
          <MetricGauge
            label="Merge Rate"
            value={mergeRateStr}
            percentage={mergeRateVal || 0}
            tier={rank}
          />
          <MetricGauge
            label="Response"
            value={firstResponseStr}
            percentage={responsePercentage}
            tier={rank}
          />
          <MetricGauge
            label="1st-Timer"
            value={firstTimerStr}
            percentage={firstTimerRateVal || 0}
            tier={rank}
          />
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[12px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5 min-w-0">
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
              className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80 font-medium text-[11px] hover:bg-emerald-900/80 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
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
            <span className="text-slate-500 shrink-0 whitespace-nowrap text-[11px]">Tracked</span>
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
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-700 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Scale className="h-3 w-3 shrink-0" />
            <span>Compare</span>
          </span>
          <span className="font-semibold text-orange-400 group-hover:text-orange-300 group-hover:underline flex items-center gap-0.5 text-[12px] shrink-0 whitespace-nowrap transition-colors">
            Details ↗
          </span>
        </div>
      </div>
    </a>
  );
}
