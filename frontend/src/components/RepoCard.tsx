"use client";

import React from "react";
import { Repo } from "@/types/opendoor";
import { ArrowUpRight } from "lucide-react";
import posthog from "posthog-js";

interface RepoCardProps {
  repo: Repo;
  isLoggedIn?: boolean;
  isSpotlight?: boolean;
  spotlightIndex?: number;
  layout?: "card" | "row";
}

export function RepoCard({ repo, isSpotlight = false, layout = "card" }: RepoCardProps) {
  const rank = (repo.class_rank || repo.c_rank_tier || "A").toUpperCase();
  
  // Extract owner and repository name cleanly
  const fullName = repo.full_name || (repo.owner && repo.name ? `${repo.owner}/${repo.name}` : repo.name || "");

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

  const firstTimerRateVal = repo.first_timer_success_rate !== undefined && repo.first_timer_success_rate >= 0
    ? Math.round(repo.first_timer_success_rate)
    : null;
  const firstTimerStr = firstTimerRateVal !== null ? `${firstTimerRateVal}%` : " - ";

  const gfiCount = repo.good_first_issue_count ?? 0;
  const gfiIssuesUrl = `https://github.com/${fullName}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`;

  const handleGfiClick = () => {
    posthog.capture("gfi_badge_clicked", {
      repo_full_name: fullName,
      source: "repo_card",
    });
    window.open(gfiIssuesUrl, "_blank", "noopener,noreferrer");
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

  if (layout === "row") {
    return (
      <a
        href={`/${fullName}`}
        onClick={handleClick}
        title={`View ${fullName} C-Rank scorecard, PR response time & merge metrics`}
        className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-[#0D111A] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[#111827] transition-all text-current no-underline cursor-pointer"
      >
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <span className={`tier-badge tier-${rank} shrink-0 mt-0.5`}>{rank}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--purple-bright)] transition-colors truncate">
                {fullName}
              </span>
              <span className="pill">{repo.language || "Code"}</span>
              <span className="pill">★ {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mt-1 font-sans">
              {repo.description || "No repository description available."}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-6 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[var(--border-subtle)] font-mono">
          <div className="text-left md:text-right">
            <div className="tele-label">Merge rate</div>
            <div className="text-sm font-bold text-[var(--green-bright)] tabular">{mergeRateStr}</div>
          </div>
          <div className="text-left md:text-right">
            <div className="tele-label">Review wait</div>
            <div className="text-sm font-bold text-[var(--text-primary)] tabular">{firstResponseStr}</div>
          </div>
          <div className="text-left md:text-right hidden sm:block">
            <div className="tele-label">1st-timers</div>
            <div className="text-sm font-bold text-[var(--green-bright)] tabular">{firstTimerStr}</div>
          </div>
          <span className="pill pill-purple self-center group-hover:bg-[rgba(163,113,247,0.2)] transition-colors">
            Scorecard →
          </span>
        </div>
      </a>
    );
  }

  return (
    <a
      href={`/${fullName}`}
      onClick={handleClick}
      title={`View ${fullName} C-Rank scorecard, PR response time & merge metrics`}
      className={`repo-card group ${isSpotlight ? "card-highlight" : ""}`}
    >
      <div>
        <div className="repo-header">
          <div>
            <div className="repo-name group-hover:text-[var(--purple-bright)] transition-colors flex items-center gap-1.5">
              <span>{fullName}</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--purple-bright)] shrink-0" />
            </div>
            <div className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5">
              {repo.language || "Code"} • {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars} stars
            </div>
          </div>
          <span className={`tier-badge tier-${rank}`}>{rank}</span>
        </div>

        <p className="repo-desc">{repo.description || "No repository description available."}</p>
      </div>

      <div>
        <div className="repo-telemetry">
          <div>
            <div className="tele-label">Merge Rate</div>
            <div className="tele-val text-[var(--green-bright)]">{mergeRateStr}</div>
          </div>
          <div>
            <div className="tele-label">Median Review</div>
            <div className="tele-val">{firstResponseStr}</div>
          </div>
          <div>
            <div className="tele-label">First-Timer Rate</div>
            <div className="tele-val text-[var(--green-bright)]">{firstTimerStr}</div>
          </div>
          <div>
            <div className="tele-label">Active GFI</div>
            <div className="tele-val">{gfiCount > 0 ? `${gfiCount} open` : "None"}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {repo.access_status === "closed" ? (
            <span className="pill pill-red" title={repo.access_status_reason || "Closed to external PRs"}>Closed Access</span>
          ) : repo.access_status === "collaborator_only" ? (
            <span className="pill pill-amber" title={repo.access_status_reason || "Collaborator only"}>Collaborator Only</span>
          ) : repo.access_status === "vouch_required" ? (
            <span className="pill pill-purple" title={repo.access_status_reason || "Vouch required"}>Vouch Required</span>
          ) : (
            <span className="pill pill-green">Open Access</span>
          )}
          {repo.ai_policy === "prohibited" ? (
            <span className="pill pill-red" title={repo.ai_policy_reason || "AI contributions prohibited"}>AI Prohibited</span>
          ) : repo.ai_policy === "disclosure_required" ? (
            <span className="pill pill-amber" title={repo.ai_policy_reason || "AI disclosure required"}>AI Disclose</span>
          ) : repo.ai_policy === "allowed" ? (
            <span className="pill pill-purple" title={repo.ai_policy_reason || "AI assisted welcome"}>AI Allowed</span>
          ) : null}
          {gfiCount > 0 && (
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleGfiClick();
              }}
              className="pill hover:border-[var(--border-strong)] transition-colors ml-auto cursor-pointer"
            >
              {gfiCount} GFI →
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
