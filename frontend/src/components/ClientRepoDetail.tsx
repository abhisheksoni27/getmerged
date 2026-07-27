"use client";

import React, { useEffect, useState } from "react";
import { Repo, AIInsights } from "@/types/opendoor";
import {
  ArrowLeft,
  GitMerge,
  Clock,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Lock,
  GitPullRequest,
  Bookmark,
  Users,
  Activity,
  Star,
  FileCode2,
  Check,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import posthog from "posthog-js";

interface ClientRepoDetailProps {
  repo: Repo | null;
  fullName: string;
}

export function ClientRepoDetail({ repo, fullName }: ClientRepoDetailProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return typeof document !== "undefined" && document.cookie.includes("opendoor_token=");
  });
  const [isWatching, setIsWatching] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsights | null>(null);

  const rank = repo?.class_rank || repo?.c_rank_tier || "A";
  const score = repo?.c_rank_score || repo?.score || 78.5;

  useEffect(() => {
    const hasToken = typeof document !== "undefined" && document.cookie.includes("opendoor_token=");

    if (hasToken && repo?.id) {
      // 1. Check watchlist status
      fetch(`${API_BASE_URL}/api/v1/user/watchlist`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.watchlist && Array.isArray(data.watchlist)) {
            const found = data.watchlist.some(
              (item: string | { repo_id: string }) =>
                typeof item === "string" ? item === String(repo.id) : String(item.repo_id) === String(repo.id)
            );
            setIsWatching(found);
          }
        })
        .catch(() => {});

      // 2. Fetch AI Insights
      fetch(`${API_BASE_URL}/api/v1/repos/${repo.id}/insights`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.insights) {
            setInsights(data.insights);
          }
        })
        .catch(() => {});
    }
  }, [repo?.id]);

  const handleWatchToggle = async () => {
    if (!isLoggedIn) {
      window.location.href = `${API_BASE_URL}/api/v1/auth/github`;
      return;
    }

    if (!repo?.id || watchLoading) return;
    setWatchLoading(true);

    try {
      if (isWatching) {
        const res = await fetch(`${API_BASE_URL}/api/v1/user/watchlist/${repo.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) {
          setIsWatching(false);
          posthog.capture('repo_watch_toggled', {
            action: 'unwatched',
            repo_full_name: fullName,
            repo_tier: rank,
          });
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/v1/user/watchlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ repo_id: repo.id }),
        });
        if (res.ok) {
          setIsWatching(true);
          posthog.capture('repo_watch_toggled', {
            action: 'watched',
            repo_full_name: fullName,
            repo_tier: rank,
          });
        }
      }
    } catch (e) {
      console.error("Failed to toggle watchlist", e);
    } finally {
      setWatchLoading(false);
    }
  };

  // Humanize metric values
  const responseTimeStr =
    repo?.time_to_first_response_hours !== undefined && repo.time_to_first_response_hours > 0
      ? repo.time_to_first_response_hours < 1
        ? `${Math.round(repo.time_to_first_response_hours * 60)} min`
        : `${repo.time_to_first_response_hours.toFixed(1)} hours`
      : "—";

  const responseCommentary =
    repo?.time_to_first_response_hours !== undefined && repo.time_to_first_response_hours > 0
      ? repo.time_to_first_response_hours < 1
        ? "⚡ Fast reviewer response"
        : "Standard maintainer review cycle"
      : "No reviewer activity recorded";

  const mergeRateStr =
    repo?.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate >= 0
      ? `${repo.external_pr_merge_rate.toFixed(1)}%`
      : "—";

  const mergeCommentary =
    repo?.external_pr_merge_rate !== undefined
      ? repo.external_pr_merge_rate > 75
        ? "High acceptance rate for external PRs"
        : repo.external_pr_merge_rate > 30
        ? "Moderate PR acceptance rate"
        : "Selective PR acceptance rate"
      : "Low or zero PR merges recorded";

  const firstTimerSuccessStr =
    repo?.first_timer_success_rate !== undefined && repo.first_timer_success_rate >= 0
      ? `${repo.first_timer_success_rate.toFixed(1)}%`
      : "—";

  const firstTimerCommentary =
    repo?.first_timer_success_rate !== undefined && repo.first_timer_success_rate > 50
      ? "Strong first-timer PR acceptance rate"
      : repo?.first_timer_success_rate !== undefined && repo.first_timer_success_rate > 0
      ? "Accepts new contributor PRs"
      : "No first-timer merges recorded in window";

  const getRankBadgeStyle = (r?: string) => {
    switch (r) {
      case "S":
        return "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20";
      case "A":
        return "bg-blue-600 text-white border-blue-700 shadow-blue-500/20";
      case "B":
        return "bg-amber-500 text-white border-amber-600 shadow-amber-500/20";
      case "C":
        return "bg-purple-600 text-white border-purple-700 shadow-purple-500/20";
      default:
        return "bg-zinc-800 text-white border-zinc-900";
    }
  };

  const getRankHumanLabel = (r?: string) => {
    switch (r) {
      case "S":
        return "Super Welcoming";
      case "A":
        return "Welcoming";
      case "B":
        return "Moderate";
      case "C":
        return "Slow Review";
      default:
        return "Scored";
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 w-full overflow-hidden">
      {/* Navigation Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-900 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Explorer
      </Link>

      {/* Header Title & Watch Actions */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between border-b border-zinc-200 pb-6 mb-8">
        <div className="min-w-0 flex-1">
          {/* Prominent High-Visibility Vibe Badge & Score */}
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span
              className={`rounded-lg px-3 py-1 font-mono text-xs font-bold border shadow-xs ${getRankBadgeStyle(
                rank
              )}`}
            >
              {getRankHumanLabel(rank)}
            </span>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-xs font-bold text-zinc-800">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Score: {score.toFixed(1)} / 100</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 break-words tracking-tight">
            {fullName}
          </h1>
          <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 max-w-2xl leading-relaxed">
            {repo?.description ||
              "Public GitHub repository indexed and scored by maintainer responsiveness for contributor accessibility."}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleWatchToggle}
              disabled={watchLoading}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium font-mono transition-all shadow-xs ${
                isWatching
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {isWatching ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Bookmark className="h-3.5 w-3.5" />}
              {isWatching ? "Watching" : "Watch Repo"}
            </button>
            <a
              href={repo?.github_url || `https://github.com/${fullName}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => posthog.capture('repo_github_link_clicked', { repo_full_name: fullName, repo_tier: rank })}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-all shadow-xs"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
          {/* Issue #5: Explainer banner for Watch Repo value prop */}
          <p className="text-[11px] font-mono text-zinc-500 max-w-xs text-right leading-tight">
            💡 <strong className="text-zinc-700">Why Watch?</strong> Receive instant notifications if this repo&apos;s review velocity or C-Rank™ tier changes.
          </p>
        </div>
      </div>

      {/* Primary Metric Breakdown Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6 font-mono">
        <div className="rounded-xl border border-zinc-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
            <Clock className="h-4 w-4 text-emerald-600" />
            <span>Time to First Response</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900">{responseTimeStr}</div>
          <div className="mt-1 text-[11px] text-zinc-500">{responseCommentary}</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
            <GitMerge className="h-4 w-4 text-blue-600" />
            <span>External PR Merge Rate</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900">{mergeRateStr}</div>
          <div className="mt-1 text-[11px] text-zinc-500">{mergeCommentary}</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>First-Time Contributor Success</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900">{firstTimerSuccessStr}</div>
          <div className="mt-1 text-[11px] text-zinc-500">{firstTimerCommentary}</div>
        </div>
      </div>

      {/* C-Rank Weight & Tier Breakdown Interactive Pie Visualizer */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs mb-6 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" /> C-Rank™ Scoring Algorithm Formula Weights
          </h3>
          <span className="text-[11px] text-zinc-400 font-sans">Formula weights used to compute overall score out of 100</span>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="relative flex items-center justify-center h-44 w-44 group">
            {/* SVG Pie Chart representing key weighted components */}
            <svg viewBox="0 0 100 100" className="h-full w-full transform -rotate-90">
              {/* Outer background ring */}
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f4f4f5" strokeWidth="16" />
              {/* S-Tier / Merge Rate segment (40%) - Emerald */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#10b981"
                strokeWidth="16"
                strokeDasharray="100.5 150.8"
                strokeDashoffset="0"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <title>PR Merge Rate Weight in Formula: 40%</title>
              </circle>
              {/* A-Tier / Response Speed segment (30%) - Blue */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#2563eb"
                strokeWidth="16"
                strokeDasharray="75.4 175.9"
                strokeDashoffset="-100.5"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <title>First Response Speed Weight in Formula: 30%</title>
              </circle>
              {/* B-Tier / First Timer Success segment (18%) - Amber */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#d97706"
                strokeWidth="16"
                strokeDasharray="45.2 206.1"
                strokeDashoffset="-175.9"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <title>First-Timer Success Weight in Formula: 18%</title>
              </circle>
              {/* C-Tier / Slow Review segment (12%) - Purple */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#9333ea"
                strokeWidth="16"
                strokeDasharray="30.1 221.2"
                strokeDashoffset="-221.1"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <title>Slow Review Latency Weight in Formula: 12%</title>
              </circle>
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-bold text-zinc-900">{score.toFixed(0)}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Score</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 bg-zinc-50 hover:bg-emerald-50/50 transition-colors group">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-zinc-800">External PR Merge Rate</span>
              </div>
              <span className="font-bold text-zinc-600 group-hover:text-emerald-700">{mergeRateStr}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 bg-zinc-50 hover:bg-blue-50/50 transition-colors group">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-600 shrink-0" />
                <span className="font-semibold text-zinc-800">First Response Speed</span>
              </div>
              <span className="font-bold text-zinc-600 group-hover:text-blue-700">{responseTimeStr}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 bg-zinc-50 hover:bg-amber-50/50 transition-colors group">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-600 shrink-0" />
                <span className="font-semibold text-zinc-800">First-Timer Success</span>
              </div>
              <span className="font-bold text-zinc-600 group-hover:text-amber-700">{firstTimerSuccessStr}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-purple-100 bg-purple-50/40 hover:bg-purple-50 transition-colors group">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-purple-600 shrink-0" />
                <span className="font-semibold text-purple-900">Average PR Merge Time</span>
              </div>
              <span className="font-bold text-purple-700">
                {repo?.time_to_merge_hours !== undefined && repo.time_to_merge_hours > 0
                  ? repo.time_to_merge_hours < 1
                    ? `${Math.round(repo.time_to_merge_hours * 60)} min`
                    : `${repo.time_to_merge_hours.toFixed(1)} hours`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Detailed Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4 mb-10 font-mono">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <span>Stars</span>
          </div>
          <div className="text-base font-bold text-zinc-900">
            {repo?.stars ? repo.stars.toLocaleString("en-US") : "—"}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1">
            <FileCode2 className="h-3.5 w-3.5 text-zinc-600" />
            <span>Primary Language</span>
          </div>
          <div className="text-base font-bold text-zinc-900">{repo?.language || "Other"}</div>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1">
            <Users className="h-3.5 w-3.5 text-indigo-500" />
            <span>Active Maintainers</span>
          </div>
          <div className="text-base font-bold text-zinc-900">
            {repo?.distinct_maintainer_count !== undefined ? repo.distinct_maintainer_count : "3+"}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            <span>Repo Activity</span>
          </div>
          <div className="text-base font-bold text-zinc-900">
            {repo?.staleness_flag ? "Stale" : "Active"}
          </div>
        </div>
      </div>

      {/* AI Insights & Maintainer Vibe Check Section */}
      <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm overflow-hidden mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <h2 className="font-mono text-base font-bold text-zinc-900">
            AI Maintainer Vibe Check & PR Guidelines
          </h2>
        </div>

        {isLoggedIn ? (
          <div className="space-y-4 pt-2">
            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-sans">
              {insights?.maintainer_vibe ||
                "Active maintainer team with regular turnaround times on pull requests. Community guidelines recommend concise PR scopes."}
            </p>
            {insights?.pr_guidelines && insights.pr_guidelines.length > 0 && (
              <ul className="space-y-2 text-xs font-mono text-zinc-800 border-t border-zinc-100 pt-3">
                {insights.pr_guidelines.map((guide, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{guide}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="relative pb-6">
            {/* Blurred Content */}
            <div className="space-y-4 blur-xs select-none opacity-30 pointer-events-none pb-12">
              <p className="text-sm text-zinc-700">
                Active maintainer team with fast turnaround time on pull requests. Guidance provided for first-time contributors.
              </p>
              <ul className="space-y-2 text-xs text-zinc-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Ensure test coverage passes 80%
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Use descriptive PR body templates
                </li>
              </ul>
            </div>

            {/* Auth Wall Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-xs text-center px-4 py-8 rounded-xl">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-zinc-100 mb-3 border border-zinc-200 shadow-xs shrink-0">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-700" />
              </div>
              <h3 className="text-sm sm:text-base font-mono font-bold text-zinc-900 mb-1.5">
                Unlock Full AI Insights & PR Guidelines
              </h3>
              <p className="text-xs text-zinc-600 max-w-md mb-5 leading-relaxed font-sans">
                Sign in with GitHub to view full PR submission checklists, maintainer review vibe checks, and watch repos for rank shift updates.
              </p>
              <a
                href={`${API_BASE_URL}/api/v1/auth/github`}
                onClick={() => posthog.capture('github_sign_in_clicked', { source: 'ai_insights_wall', repo_full_name: fullName })}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 sm:px-6 sm:py-2.5 text-xs font-medium font-mono text-white shadow-xs hover:bg-zinc-800 active:scale-95 transition-all"
              >
                <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Sign in with GitHub
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Issues #6, #7, #8: Contributor Community Feedback & Verification Module */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm mb-10 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-100 pb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 flex items-center gap-2.5">
              <Users className="h-6 w-6 text-blue-600 shrink-0" />
              Contributor Community Vibe Feedback
            </h2>
            <p className="text-sm text-zinc-600 mt-1 leading-relaxed">
              Real contributor sentiment vs algorithmic C-Rank™ telemetry. Have you sent a pull request here?
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full shrink-0">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            GitHub Verification Active
          </span>
        </div>

        {/* High-Impact Contributor Callout */}
        <div className="relative overflow-hidden rounded-xl border border-blue-200/70 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white p-5 mb-8 text-zinc-900 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shrink-0 shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-zinc-900">
                Contributed to <span className="text-blue-600">{fullName}</span> previously?
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-zinc-700 leading-relaxed">
                Save fellow developers hours of waiting. If your commits are merged in this repository, your review will instantly receive an official <strong className="text-blue-900">Verified Contributor</strong> badge.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Contributor Feedback Form */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 sm:p-6">
          <h3 className="font-mono text-sm font-bold text-zinc-900 mb-4 uppercase tracking-wider">
            Share Your Experience
          </h3>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-mono font-bold text-zinc-700 uppercase tracking-wider mb-2.5">
                Maintainer Sentiment Vibe
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: "welcoming", label: "🟢 Welcoming & Fast", style: "hover:border-emerald-500 hover:bg-emerald-50 text-emerald-900" },
                  { id: "selective", label: "🟡 Selective / strict PRs", style: "hover:border-amber-500 hover:bg-amber-50 text-amber-900" },
                  { id: "unresponsive", label: "🔴 Unresponsive / Stale", style: "hover:border-rose-500 hover:bg-rose-50 text-rose-900" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={(e) => {
                      const input = document.getElementById("sentiment-val") as HTMLInputElement;
                      if (input) input.value = s.id;
                      // Visual selection feedback
                      document.querySelectorAll(".sentiment-btn").forEach((b) => b.classList.remove("ring-2", "ring-zinc-900", "bg-white", "shadow-sm"));
                      e.currentTarget.classList.add("ring-2", "ring-zinc-900", "bg-white", "shadow-sm");
                    }}
                    className={`sentiment-btn text-xs sm:text-sm font-mono font-semibold px-4 py-2.5 rounded-xl border border-zinc-200 bg-white/80 transition-all cursor-pointer ${s.style}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <input type="hidden" id="sentiment-val" defaultValue="welcoming" />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-zinc-700 uppercase tracking-wider mb-2">
                Your Contributor Review
              </label>
              <textarea
                id="feedback-comment"
                rows={3}
                placeholder={`How was submitting a PR to ${fullName}? Did maintainers provide constructive review comments?`}
                className="w-full text-xs sm:text-sm font-sans rounded-xl border border-zinc-300 p-3.5 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-xs"
              />
            </div>

            <button
              type="button"
              onClick={async () => {
                const commentEl = document.getElementById("feedback-comment") as HTMLTextAreaElement;
                const sentimentEl = document.getElementById("sentiment-val") as HTMLInputElement;
                if (!commentEl?.value.trim()) return alert("Please enter your feedback comment.");

                try {
                  const res = await fetch(`${API_BASE_URL}/api/v1/user/feedback`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      repo_id: repo?.id || "",
                      full_name: fullName,
                      sentiment: sentimentEl.value || "welcoming",
                      comment: commentEl.value.trim(),
                    }),
                  });
                  if (res.ok) {
                    alert("Feedback submitted successfully!");
                    commentEl.value = "";
                  } else {
                    alert("Please sign in with GitHub to submit feedback.");
                  }
                } catch {
                  alert("Failed to submit feedback. Ensure you are signed in.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-xs sm:text-sm font-mono font-bold text-white shadow-sm hover:bg-zinc-800 active:scale-98 transition-all cursor-pointer"
            >
              <span>Submit Contributor Review</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content-Heavy SEO Modules for Search Engines & Crawlers */}
      <div className="space-y-8 font-sans border-t border-zinc-200 pt-8 text-zinc-800">
        {/* Module 1: Contributor Compatibility Report */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold font-mono text-zinc-900 mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600 shrink-0" />
            Contributor Compatibility & Review Speed Analysis for {fullName}
          </h2>
          <div className="prose prose-sm text-zinc-600 leading-relaxed max-w-none space-y-3">
            <p>
              When evaluating whether to contribute to <strong className="text-zinc-900">{fullName}</strong>, response velocity and maintainer engagement are crucial. Opendoor continuously tracks pull request trajectories, first-comment latency, and code review rounds to help developers avoid submitting pull requests to backlogged repositories.
            </p>
            <p>
              Currently, maintainers of {fullName} acknowledge new external contributions in approximately{" "}
              <strong className="text-zinc-900">{responseTimeStr}</strong>. Out of all submitted pull requests from non-core authors in the last 180-day window,{" "}
              <strong className="text-zinc-900">{mergeRateStr}</strong> were successfully merged into the primary branch.
            </p>
          </div>
        </section>

        {/* Module 2: Maintainer FAQ Accordion */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold font-mono text-zinc-900 mb-4 flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-blue-600 shrink-0" />
            Frequently Asked Questions — Contributing to {fullName}
          </h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 font-mono mb-1.5">
                Is {fullName} welcoming to first-time open-source contributors?
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                {fullName} has a recorded first-timer success rate of <strong>{firstTimerSuccessStr}</strong>. Repositories ranked Tier S or Tier A typically have maintainers who provide constructive feedback on initial PRs and label beginner-friendly issues.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 font-mono mb-1.5">
                How fast can I expect code review feedback on my pull request?
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                The initial maintainer response time averages ~<strong>{responseTimeStr}</strong>. Keep your pull requests focused, write clear commit messages, and ensure all CI checks pass to accelerate review speed.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 font-mono mb-1.5">
                What does the {score.toFixed(1)} C-Rank™ score represent?
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                The C-Rank™ system evaluates repositories on a 0 to 100 scale using a weighted sum of external PR merge rate, initial response time, maintainer count, and first-timer success. A score of {score.toFixed(1)} places this project in the <strong>{getRankHumanLabel(rank)}</strong> tier.
              </p>
            </div>
          </div>
        </section>

        {/* Module 3: Methodology Explanation */}
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-6">
          <h2 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider mb-2">
            Opendoor C-Rank™ Indexing Standard
          </h2>
          <p className="text-xs text-zinc-600 leading-relaxed">
            All telemetry metrics displayed for {fullName} are automatically retrieved via the GitHub GraphQL API and recalculated daily. Insider pull requests submitted by repository owners or organization members are excluded from merge rate calculations to preserve objective external contributor statistics.
          </p>
        </section>
      </div>
    </main>
  );
}
