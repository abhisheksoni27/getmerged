"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Repo } from "@/types/opendoor";
import { Star, ArrowUpRight, Flame, ShieldCheck, Scale } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";
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

  const getBadgeStyle = (r?: string) => {
    switch (r) {
      case "S":
        return {
          badgeClass: "bg-emerald-500/10 text-zinc-950 border border-emerald-600/30 font-bold",
          label: "Super Welcoming",
          indicatorColor: "bg-emerald-600",
        };
      case "A":
        return {
          badgeClass: "bg-[#bfdbff] text-zinc-950 border border-blue-600/30 font-bold",
          label: "Welcoming",
          indicatorColor: "bg-blue-600",
        };
      case "B":
        return {
          badgeClass: "bg-amber-500/10 text-zinc-950 border border-amber-600/30 font-bold",
          label: "Moderate",
          indicatorColor: "bg-amber-600",
        };
      case "C":
        return {
          badgeClass: "bg-[#e5dbff] text-zinc-950 border border-purple-600/30 font-bold",
          label: "Slow Review",
          indicatorColor: "bg-purple-600",
        };
      case "D":
        return {
          badgeClass: "bg-[#ffb3c7] text-zinc-950 border border-rose-600/30 font-bold",
          label: "Unmaintained",
          indicatorColor: "bg-rose-600",
        };
      default:
        return {
          badgeClass: "bg-zinc-100 text-zinc-800 border border-zinc-200 font-bold",
          label: "Scored",
          indicatorColor: "bg-zinc-600",
        };
    }
  };

  const badgeStyle = getBadgeStyle(rank);

  const mergeRate =
    repo.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate > 0
      ? `${Math.round(repo.external_pr_merge_rate)}%`
      : "-";

  const firstResponseHours = repo.time_to_first_response_hours;
  const firstResponse =
    firstResponseHours && firstResponseHours > 0
      ? firstResponseHours < 1
        ? "<1h"
        : firstResponseHours < 24
        ? `${Math.round(firstResponseHours)}h`
        : `${Math.round(firstResponseHours / 24)}d`
      : "-";

  const firstTimerRate =
    repo.first_timer_success_rate !== undefined && repo.first_timer_success_rate >= 0
      ? `${Math.round(repo.first_timer_success_rate)}%`
      : "-";

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
      className={`group dev-card-glow relative flex h-full flex-col justify-between rounded-2xl p-5 bg-white border transition-all duration-200 block text-current no-underline cursor-pointer  hover:-translate-y-0.5 ${
        isSpotlight
          ? "border-zinc-300 shadow-md hover:border-zinc-400 hover:border-b-black"
          : "border-zinc-200/90 shadow-xs hover:border-zinc-300 hover:border-b-black"
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-2xl border border-zinc-200/60 bg-zinc-50 overflow-hidden shrink-0 group-hover:border-zinc-300 transition-colors">
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
              <div className="font-space text-sm font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors flex items-center gap-1 min-w-0" title={repo.full_name}>
                <span className="truncate">{repo.full_name}</span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-zinc-500">
                <span className="flex items-center gap-1 font-semibold text-zinc-700">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                  {repo.stars >= 1_000 ? `${(repo.stars / 1_000).toFixed(1)}k` : repo.stars}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 truncate text-zinc-600">
                  <LangLogo language={repo.language} />
                  <span className="truncate">{repo.language || "Code"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Rank Badge */}
          <div className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono shrink-0 flex items-center gap-1.5 ${badgeStyle.badgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badgeStyle.indicatorColor}`} />
            <span>{badgeStyle.label}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed font-sans font-normal mb-3 h-10">
          {repo.description || "No repository description available."}
        </p>

        {/* Topic chips */}
        <div className="h-6 flex items-center gap-1.5 overflow-hidden mb-3.5">
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
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200/80 font-mono text-[10px] sm:text-[11px] font-medium hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 transition-colors cursor-pointer shrink-0 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              #{topic}
            </span>
          ))}
          {topicOverflow > 0 && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-50 text-zinc-500 border border-zinc-200 font-mono text-[10px] sm:text-[11px] font-medium shrink-0"
              aria-hidden="true"
            >
              +{topicOverflow}
            </span>
          )}
        </div>

        {/* Telemetry Metrics Scorecard */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-zinc-50/80 rounded-xl border border-zinc-100 mb-3.5 text-center font-mono">
          <div className="pr-1">
            <div className="text-xs font-bold text-zinc-900">{mergeRate}</div>
            <div className="text-[10px] text-zinc-500 font-medium whitespace-nowrap mt-0.5">Merge Rate</div>
          </div>
          <div className="border-x border-zinc-200/70 px-1">
            <div className="text-xs font-bold text-zinc-900">{firstResponse}</div>
            <div className="text-[10px] text-zinc-500 font-medium whitespace-nowrap mt-0.5">First Review</div>
          </div>
          <div className="pl-1">
            <div className="text-xs font-bold text-zinc-900">{firstTimerRate}</div>
            <div className="text-[10px] text-zinc-500 font-medium whitespace-nowrap mt-0.5">1st-Timers</div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
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
              className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 font-medium text-[10px] sm:text-[11px] hover:bg-emerald-100 transition-colors cursor-pointer shrink-0 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-600" />
              <span>{gfiCount} GFI</span>
            </span>
          ) : repo.is_trending ? (
            <span className="inline-flex items-center gap-1 text-orange-700 font-medium shrink-0 whitespace-nowrap text-[11px]">
              <Flame className="h-3 w-3 fill-orange-500 shrink-0" />
              <span>Trending</span>
            </span>
          ) : (
            <span className="text-zinc-400 shrink-0 whitespace-nowrap text-[10px]">Tracked</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <span
            role="button"
            tabIndex={0}
            data-testid="compare-cta"
            title={`Compare ${repo.full_name} with another repository`}
            aria-label={`Compare ${repo.full_name}`}
            onClick={handleCompareClick}
            onKeyDown={handleCompareKeyDown}
            className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-zinc-600 hover:text-emerald-700 bg-zinc-100 hover:bg-emerald-50 px-2 py-0.5 rounded-md border border-zinc-200/80 transition-colors cursor-pointer shrink-0 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <Scale className="h-3 w-3 shrink-0" />
            <span>Compare</span>
          </span>
          <span className="font-semibold text-zinc-900 group-hover:text-emerald-600 flex items-center gap-0.5 text-[10px] sm:text-[11px] shrink-0 whitespace-nowrap transition-colors">
            Details →
          </span>
        </div>
      </div>
    </a>
  );
}
