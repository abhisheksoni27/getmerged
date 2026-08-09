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
  FileCode2,
  Check,
  ArrowRight,
  AlertCircle,
  Info,
  Star,
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { getLanguageSlug } from "@/lib/languageSlug";
import posthog from "posthog-js";
import { AuthModal } from "@/components/AuthModal";
import { RepoCard } from "@/components/RepoCard";

interface ClientRepoDetailProps {
  repo: Repo | null;
  fullName: string;
}

export function ClientRepoDetail({ repo, fullName }: ClientRepoDetailProps) {
  const [isLoggedIn] = useState(() => {
    return typeof document !== "undefined" && document.cookie.includes("opendoor_token=");
  });
  const [isWatching, setIsWatching] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [badgeShowPoints, setBadgeShowPoints] = useState(false);
  const [badgeColor, setBadgeColor] = useState("auto");
  const [isVerifiedContributor, setIsVerifiedContributor] = useState(false);
  const [githubNotFound, setGithubNotFound] = useState(false);
  const [isCheckingGithub, setIsCheckingGithub] = useState(() => !repo);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [relatedRepos, setRelatedRepos] = useState<Repo[]>([]);
  const [maintainerRating, setMaintainerRating] = useState(0);
  const [reviewSpeedRating, setReviewSpeedRating] = useState(0);
  const [beginnerRating, setBeginnerRating] = useState(0);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalConfig, setAuthModalConfig] = useState<{ title?: string; description?: string; source?: string }>({});

  const openAuthModal = (title?: string, description?: string, source = "modal") => {
    setAuthModalConfig({ title, description, source });
    setIsAuthModalOpen(true);
  };

  const rank = repo?.class_rank || repo?.c_rank_tier || "A";
  const score = repo?.c_rank_score ?? repo?.score ?? 0;
  const allFeedbackRatingsSelected = maintainerRating > 0 && reviewSpeedRating > 0 && beginnerRating > 0;

  const badgeQuery =
    badgeShowPoints || badgeColor !== "auto"
      ? `?${[
          badgeShowPoints ? "points=1" : "",
          badgeColor !== "auto" ? `color=${badgeColor}` : "",
        ].filter(Boolean).join("&")}`
      : "";
  const badgePreviewUrl = `${API_BASE_URL}/badge/${fullName}.svg${badgeQuery}`;
  const badgeMarkdownUrl = `https://opendoor.abhishekco.de/badge/${fullName}.svg${badgeQuery}`;

  useEffect(() => {
    if (!repo && fullName) {
      const parts = fullName.split("/");
      if (parts.length === 2) {
        setIsCheckingGithub(true);
        // Client-side fetch to GitHub API to check repository existence before queueing
        fetch(`https://api.github.com/repos/${parts[0]}/${parts[1]}`)
          .then((res) => {
            if (res.status === 404) {
              setGithubNotFound(true);
              setIsCheckingGithub(false);
              return null;
            }
            setIsCheckingGithub(false);
            return fetch(`${API_BASE_URL}/api/v1/repos/queue`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ owner: parts[0], name: parts[1] }),
            });
          })
          .then((res) => (res && res.ok ? res.json() : null))
          .then(() => {})
          .catch(() => {
            setIsCheckingGithub(false);
          });
      }
    }
  }, [repo, fullName]);

  // History Timeline Refactored Away

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

    const targetId = repo?.id ? repo.id : (fullName ? encodeURIComponent(fullName) : "");
    if (targetId) {
      // 3. Fetch Similar/Related Repositories for Interlinking (Issue #55)
      fetch(`${API_BASE_URL}/api/v1/repos/${targetId}/related?limit=3`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.related && Array.isArray(data.related)) {
            setRelatedRepos(data.related);
          }
        })
        .catch(() => {});
    }
  }, [repo?.id, fullName]);

  const handleWatchToggle = async () => {
    if (!isLoggedIn) {
      openAuthModal(
        "Watch Repository for Live Alerts",
        "Sign in with GitHub to add this repository to your watchlists and track maintainer response trends.",
        "watchlist"
      );
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

  const responseTimeStr =
    repo?.time_to_first_response_hours !== undefined && repo.time_to_first_response_hours > 0
      ? repo.time_to_first_response_hours < 1
        ? "<1 hour"
        : repo.time_to_first_response_hours < 24
        ? `${Math.floor(repo.time_to_first_response_hours)} hours`
        : `${Math.floor(repo.time_to_first_response_hours / 24)} days+`
      : "-";

  const responseCommentary =
    repo?.time_to_first_response_hours !== undefined && repo.time_to_first_response_hours > 0
      ? repo.time_to_first_response_hours < 1
        ? "⚡ Fast reviewer response"
        : "Standard maintainer review cycle"
      : "No reviewer activity recorded";

  const mergeRateStr =
    repo?.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate >= 0
      ? `${repo.external_pr_merge_rate.toFixed(1)}%`
      : "-";

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
      : "-";

  const firstTimerCommentary =
    repo?.first_timer_success_rate !== undefined && repo.first_timer_success_rate > 50
      ? "Strong first-timer PR acceptance rate"
      : repo?.first_timer_success_rate !== undefined && repo.first_timer_success_rate > 0
      ? "Accepts new contributor PRs"
      : "No first-timer merges recorded in window";

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

  if (isCheckingGithub) {
    return <RepoDetailSkeleton />;
  }

  if (!repo) {
    if (githubNotFound) {
      return (
        <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12 flex-1 w-full font-sans">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-900 transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Explorer
          </Link>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-8 sm:p-10 shadow-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 mb-5">
              <AlertCircle className="h-7 w-7" />
            </div>

            <span className="inline-block rounded-full bg-rose-100 px-3 py-1 font-mono text-xs font-bold text-rose-800 mb-3">
              Repository Not Found
            </span>

            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 mb-3">
              {fullName}
            </h1>

            <p className="text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed mb-8">
              This repository does not exist on GitHub or is private. Please verify the owner and repository name.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-xs font-mono font-bold text-white hover:bg-zinc-800 transition-all shadow-xs"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Explorer
              </Link>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12 flex-1 w-full font-sans">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-900 transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Explorer
        </Link>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 sm:p-10 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mb-5">
            <Activity className="h-7 w-7" />
          </div>

          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 font-mono text-xs font-bold text-amber-800 mb-3">
            Indexing in Progress
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 mb-3">
            {fullName}
          </h1>

          <p className="text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed mb-8">
            This repository is currently in our indexing queue. Our telemetry engine will analyze maintainer response speeds and PR merge rates in our next processing run.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isLoggedIn ? (
              <button
                onClick={handleWatchToggle}
                disabled={watchLoading}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-xs font-mono font-bold text-white hover:bg-zinc-800 transition-all shadow-xs"
              >
                <Bookmark className="h-4 w-4 text-amber-400" />
                {isWatching ? "Watching Repo" : "Watch Repo for Updates"}
              </button>
            ) : (
              <button
                onClick={() => openAuthModal(
                  "Get Notification Updates",
                  `Sign in with GitHub to get notified as soon as ${fullName} indexing completes and statistics are ready.`,
                  "indexing_watch"
                )}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-xs font-mono font-bold text-white hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
              >
                <Lock className="h-4 w-4 text-amber-400" />
                Sign in with GitHub to Get Notified
              </button>
            )}

            <a
              href={`https://github.com/${fullName}`}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 text-xs font-mono font-medium text-zinc-700 hover:bg-zinc-50 transition-all"
            >
              <GitPullRequest className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </main>
    );
  }

  const owner = repo?.owner || fullName.split("/")[0];
  const ownerAvatarUrl = `https://github.com/${owner}.png`;

  const getRankBadgeStyleNeobrutalist = (r?: string) => {
    switch (r) {
      case "S":
        return "bg-emerald-400 text-[#222831]";
      case "A":
        return "bg-blue-400 text-white";
      case "B":
        return "bg-amber-400 text-[#222831]";
      case "C":
        return "bg-purple-400 text-white";
      default:
        return "bg-rose-400 text-[#222831]";
    }
  };

  const responseTimeVal = repo?.time_to_first_response_hours || 0;
  const responseScore = responseTimeVal > 0 ? Math.max(0, 100 - (responseTimeVal * 2.5)) : 0;
  const mergeScore = repo?.external_pr_merge_rate || 0;
  const firstTimerScore = repo?.first_timer_success_rate || 0;
  const compositeScore = (mergeScore * 0.4) + (responseScore * 0.3) + (firstTimerScore * 0.3);
  const cNPS = Math.round((compositeScore * 2) - 100);

  const distinctMaintainers = repo?.distinct_maintainer_count !== undefined ? repo.distinct_maintainer_count : 0;
  const maintainersCommentary = distinctMaintainers > 5
    ? "Highly collaborative maintainer core"
    : distinctMaintainers > 1
    ? "Small core review team"
    : distinctMaintainers === 1
    ? "Single maintainer review bottleneck"
    : "No active GitHub maintainers found (may review internally on Gerrit or internal tools)";

  return (
    <main className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8 py-10 sm:py-12 flex-1 w-full overflow-hidden">
      {/* Navigation Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-sans text-zinc-500 hover:text-zinc-900 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Explorer
      </Link>

      {/* Hero Header (Neobrutalist Sticker Layout) */}
      <div className="border-3 border-[#222831] bg-[#dfd0b8] p-6 sm:p-8 shadow-[6px_6px_0px_0px_#222831] rounded-2xl mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 transition-all duration-300 ease-out hover:-translate-y-0.5">
        <div className="flex items-start gap-4 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ownerAvatarUrl}
            alt={owner}
            className="w-16 h-16 rounded-xl border-2 border-[#222831] shadow-[3px_3px_0px_0px_#222831] bg-white shrink-0"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`inline-block border-2 border-[#222831] shadow-[2px_2px_0px_0px_#222831] px-2.5 py-0.5 font-space text-xs font-black rounded-lg uppercase tracking-wider ${getRankBadgeStyleNeobrutalist(
                  rank
                )}`}
              >
                {getRankHumanLabel(rank)}
              </span>
              {repo?.language && (
                <Link
                  href={`/rankings/${getLanguageSlug(repo.language)}`}
                  className="inline-block border-2 border-[#222831] bg-white text-[#222831] px-2.5 py-0.5 text-xs font-black font-mono rounded-lg shadow-[2px_2px_0px_0px_#222831] hover:bg-zinc-100 transition-colors"
                >
                  {repo.language}
                </Link>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-space text-[#222831] break-all tracking-tight leading-none">
              {fullName}
            </h1>
            <p className="mt-2.5 text-xs sm:text-sm text-[#222831]/80 max-w-2xl leading-relaxed font-sans">
              {repo?.description ||
                "Public GitHub repository indexed and scored by maintainer responsiveness for contributor accessibility."}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleWatchToggle}
              disabled={watchLoading}
              className={`inline-flex items-center gap-1.5 border-2 border-[#222831] rounded-xl px-4 py-2 text-xs font-bold font-sans transition-all cursor-pointer shadow-[3px_3px_0px_0px_#222831] hover:-translate-y-0.5 active:translate-y-0 ${
                isWatching
                  ? "bg-emerald-300 text-[#222831]"
                  : "bg-white text-[#222831] hover:bg-zinc-50"
              }`}
            >
              {isWatching ? <Check className="h-3.5 w-3.5 stroke-[3px]" /> : <Bookmark className="h-3.5 w-3.5 stroke-[3px]" />}
              {isWatching ? "Watching" : "Watch Repo"}
            </button>
            <a
              href={repo?.github_url || `https://github.com/${fullName}`}
              target="_blank"
              rel="nofollow noopener noreferrer"
              onClick={() => posthog.capture('repo_github_link_clicked', { repo_full_name: fullName, repo_tier: rank })}
              className="inline-flex items-center gap-1.5 border-2 border-[#222831] rounded-xl bg-[#222831] px-4 py-2 text-xs font-bold font-sans text-white hover:bg-zinc-800 transition-all shadow-[3px_3px_0px_0px_#222831] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
          <p className="text-[10px] font-sans text-[#222831]/75 max-w-xs text-left md:text-right leading-tight">
            💡 <strong className="text-[#222831]">Why Watch?</strong> Get alerts when this repo&apos;s review speed or rank updates.
          </p>
        </div>
      </div>

      {/* Macro Metrics Grid & cNPS Gauge Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Metric Cards Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Response Velocity */}
          <div className="group relative border-3 border-[#222831] bg-white p-5 shadow-[4px_4px_0px_0px_#222831] rounded-2xl transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#222831]">
            <div className="flex items-center justify-between gap-2 text-xs font-black text-zinc-500 uppercase tracking-wider mb-2 font-mono">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Response Velocity</span>
              </div>
              <Info className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
            </div>
            <div className="text-3xl font-black text-[#222831] font-mono">{responseTimeStr}</div>
            <div className="text-xs text-zinc-600 mt-1 font-sans font-medium">{responseCommentary}</div>
            <p className="text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-100 font-sans sm:hidden">
              Average latency until maintainers review or reply to PRs.
            </p>
            {/* Tooltip */}
            <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 bg-[#222831] text-white text-xs rounded-xl shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none ease-out">
              <p className="font-bold mb-1">Average Response Latency</p>
              <p className="text-zinc-300">Tracks hours until a maintainer leaves a review, comment, or PR response.</p>
            </div>
          </div>

          {/* Merge Efficiency */}
          <div className="group relative border-3 border-[#222831] bg-white p-5 shadow-[4px_4px_0px_0px_#222831] rounded-2xl transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#222831]">
            <div className="flex items-center justify-between gap-2 text-xs font-black text-zinc-500 uppercase tracking-wider mb-2 font-mono">
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Merge Efficiency</span>
              </div>
              <Info className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
            </div>
            <div className="text-3xl font-black text-[#222831] font-mono">{mergeRateStr}</div>
            <div className="text-xs text-zinc-600 mt-1 font-sans font-medium">{mergeCommentary}</div>
            <p className="text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-100 font-sans sm:hidden">
              Percentage of external community PRs successfully merged.
            </p>
            {/* Tooltip */}
            <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 bg-[#222831] text-white text-xs rounded-xl shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none ease-out">
              <p className="font-bold mb-1">External Acceptance Rate</p>
              <p className="text-zinc-300">Percentage of community pull requests successfully merged into main.</p>
            </div>
          </div>

          {/* First-Timer Success */}
          <div className="group relative border-3 border-[#222831] bg-white p-5 shadow-[4px_4px_0px_0px_#222831] rounded-2xl transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#222831]">
            <div className="flex items-center justify-between gap-2 text-xs font-black text-zinc-500 uppercase tracking-wider mb-2 font-mono">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>First-Timer Success</span>
              </div>
              <Info className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
            </div>
            <div className="text-3xl font-black text-[#222831] font-mono">{firstTimerSuccessStr}</div>
            <div className="text-xs text-zinc-600 mt-1 font-sans font-medium">{firstTimerCommentary}</div>
            <p className="text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-100 font-sans sm:hidden">
              Success rate for developers opening their first PR here.
            </p>
            {/* Tooltip */}
            <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 bg-[#222831] text-white text-xs rounded-xl shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none ease-out">
              <p className="font-bold mb-1">First PR Conversion</p>
              <p className="text-zinc-300">Rate at which developers submitting their first repository PR succeed.</p>
            </div>
          </div>

          {/* Active Maintainers */}
          <div className="group relative border-3 border-[#222831] bg-white p-5 shadow-[4px_4px_0px_0px_#222831] rounded-2xl transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#222831]">
            <div className="flex items-center justify-between gap-2 text-xs font-black text-zinc-500 uppercase tracking-wider mb-2 font-mono">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Active Maintainers</span>
              </div>
              <Info className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
            </div>
            <div className="text-3xl font-black text-[#222831] font-mono">
              {distinctMaintainers > 0 ? distinctMaintainers : "-"}
            </div>
            <div className="text-xs text-zinc-600 mt-1 font-sans font-medium">{maintainersCommentary}</div>
            <p className="text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-100 font-sans sm:hidden">
              Unique maintainers actively reviewing community submissions.
            </p>
            {/* Tooltip */}
            <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 bg-[#222831] text-white text-xs rounded-xl shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none ease-out">
              <p className="font-bold mb-1">Distinct Reviewers</p>
              <p className="text-zinc-300">Number of unique maintainers actively reviewing community code submissions.</p>
            </div>
          </div>
        </div>

        {/* cNPS Circular Gauge Card */}
        <div className="border-3 border-[#222831] bg-white p-6 shadow-[4px_4px_0px_0px_#222831] rounded-2xl flex flex-col items-center justify-between text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#222831]">
          <div className="w-full flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider font-mono">Contributor NPS</span>
            <span className={`px-2 py-0.5 text-[10px] font-black font-mono border-2 border-[#222831] rounded-md ${
              cNPS >= 30 ? "bg-emerald-100 text-emerald-800" : cNPS >= 0 ? "bg-blue-100 text-blue-800" : "bg-rose-100 text-rose-800"
            }`}>
              {cNPS >= 30 ? "PROMOTER" : cNPS >= 0 ? "NEUTRAL" : "DETRACTOR"}
            </span>
          </div>

          <div className="relative flex items-center justify-center w-36 h-36">
            {(() => {
              const radius = 50;
              const strokeWidth = 10;
              const circumference = 2 * Math.PI * radius; // ~314.16
              const cNPSPercentage = ((cNPS + 100) / 200) * 100;
              const strokeDashoffset = circumference - (cNPSPercentage / 100) * circumference;

              return (
                <>
                  <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                    <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#f4f4f5" strokeWidth={strokeWidth} />
                    <circle
                      cx="60" cy="60" r={radius} fill="transparent"
                      stroke={cNPS >= 30 ? "#10b981" : cNPS >= 0 ? "#3b82f6" : "#f43f5e"}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-[#222831] font-mono">
                      {cNPS > 0 ? `+${cNPS}` : cNPS}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono">cNPS Score</span>
                  </div>
                </>
              );
            })()}
          </div>

          <p className="text-[11px] text-zinc-500 max-w-xs font-sans mt-3 leading-tight">
            Derived Net Promoter Score rating based on accept rates, review speed, and first-timer compatibility.
          </p>
        </div>
      </div>

      {/* Fast Review Peers Interlinking Bar (Issue #55 Axis 3) */}
      {relatedRepos.length > 0 && (
        <div className="rounded-2xl border-2 border-[#222831] bg-zinc-900 p-4 shadow-[4px_4px_0px_0px_#222831] mb-10 text-white flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="font-bold text-zinc-300">Fast Review Peers in {repo?.language || "Ecosystem"}:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {relatedRepos.slice(0, 3).map((rel) => (
              <Link
                key={rel.id || rel.full_name}
                href={`/${rel.full_name}`}
                className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-300 hover:text-emerald-200 border border-zinc-700 transition-colors font-bold no-underline inline-flex items-center gap-1 text-[11px]"
              >
                <span>{rel.full_name}</span>
                <span className="text-[10px] text-zinc-400">({rel.c_rank_tier || "A"})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Guideline Drawer */}
      <div className="rounded-2xl border-3 border-[#222831] bg-white p-5 sm:p-6 shadow-[6px_6px_0px_0px_#222831] mb-10 transition-all duration-300">
        <button
          onClick={() => setIsGuidelinesOpen(!isGuidelinesOpen)}
          className="w-full flex items-center justify-between font-space text-base sm:text-lg font-black text-[#222831] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
            <span>Interactive Onboarding & Contribution Guidelines</span>
          </div>
          <span className="text-xl font-bold font-mono transition-transform duration-300" style={{ transform: isGuidelinesOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
            ▶
          </span>
        </button>

        <div className={`grid transition-all duration-500 ease-in-out ${isGuidelinesOpen ? "grid-rows-[1fr] opacity-100 mt-5" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <div className="border-t border-zinc-150 pt-4 space-y-4">
              <p className="text-sm font-sans text-zinc-700">
                Follow these instructions to increase the success rate of your pull requests in <strong>{fullName}</strong>:
              </p>
              {insights?.pr_guidelines && insights.pr_guidelines.length > 0 ? (
                <ul className="space-y-3 font-sans text-sm text-[#222831]">
                  {insights.pr_guidelines.map((guide, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{guide}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 text-indigo-900 text-xs font-sans">
                  ✨ {isLoggedIn 
                    ? "Maintainer onboarding check: No specific rules fetched. Generally ensure tests pass and pull request scope is focused."
                    : "Unlock full maintainer vibes & onboarding instructions: Please sign in with GitHub below to view detailed checklist guidelines."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* C-Rank Weight Formula Visualizer & History Timeline Removed */}

      {/* Good First Issues Count (F3) */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] mb-6 border-2 border-brand-dark shadow-[4px_4px_0px_#222831] font-mono">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" /> Open Good First Issues ({repo?.good_first_issue_count ?? 0})
          </h3>
          <a
            href={`https://github.com/${fullName}/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22%2Cgood-first-issue%2Cgood_first_issue%2C%22first%20timers%20only%22%2Cfirst-timer%2Cbeginner%2Cbeginner-friendly%2C%22beginner%20friendly%22%2Ceasy%2Ceasy-fix%2C%22easy%20fix%22%2Clow-hanging-fruit%2C%22low%20hanging%20fruit%22%2C%22help%20wanted%22%2Chelp-wanted%2Cstarter%2Cstarter-issue%2Cbitesize%2Cnew-contributor%2Cup-for-grabs%2Ce-easy%2CE-mentor`}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1"
          >
            View on GitHub <ArrowRight className="h-3 w-3" />
          </a>
        </div>
        {(repo?.good_first_issue_count ?? 0) > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-zinc-600 font-sans">
              This repo currently has <strong>{repo?.good_first_issue_count}</strong> open{" "}
              <code className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700 font-mono">good first issue</code> issues -
              a great entry point for your first contribution.
            </p>
            {repo?.language && (
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-[11px] font-sans text-zinc-500">Looking for more {repo.language} beginner tasks?</span>
                <Link
                  href={`/good-first-issue/${getLanguageSlug(repo.language)}`}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 font-sans inline-flex items-center gap-1 hover:underline"
                >
                  Explore all {repo.language} Good First Issues <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 font-sans bg-zinc-100/50 p-4 rounded-xl text-center">
              No open `good first issue` labels currently found on GitHub for this repo.
            </p>
            {repo?.language && (
              <div className="text-center pt-2">
                <Link
                  href={`/good-first-issue/${getLanguageSlug(repo.language)}`}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 font-sans inline-flex items-center gap-1 hover:underline"
                >
                  Browse open {repo.language} Good First Issues across other repos <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic README Badge Embed (F1) */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 border-2 border-brand-dark shadow-[4px_4px_0px_#222831] mb-6 font-mono">
        <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2 mb-2 font-space">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Embed C-Rank™ Badge on README
        </h3>
        <p className="text-xs text-zinc-600 font-sans mb-4">
          Show potential contributors your maintainer responsiveness with a dynamic live badge:
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4 font-sans">
          <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={badgeShowPoints}
              onChange={(e) => setBadgeShowPoints(e.target.checked)}
              className="accent-emerald-600 h-3.5 w-3.5"
            />
            Show score
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-600">
            Color
            <select
              value={badgeColor}
              onChange={(e) => setBadgeColor(e.target.value)}
              className="rounded-xl border border-transparent bg-zinc-100/50 px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="auto">Auto (tier)</option>
              <option value="emerald">Emerald</option>
              <option value="green">Green</option>
              <option value="blue">Blue</option>
              <option value="purple">Purple</option>
              <option value="pink">Pink</option>
              <option value="amber">Amber</option>
              <option value="orange">Orange</option>
              <option value="red">Red</option>
              <option value="cyan">Cyan</option>
              <option value="slate">Slate</option>
              <option value="zinc">Zinc</option>
            </select>
          </label>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-zinc-50 border-2 border-brand-dark rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,0.02)]">
          <div className="flex items-center min-h-10 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badgePreviewUrl}
              alt={`Opendoor C-Rank badge for ${fullName}`}
              width={280}
              height={28}
              className="h-7 w-auto"
            />
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`[![Opendoor C-Rank](${badgeMarkdownUrl})](https://opendoor.abhishekco.de/${fullName})`);
              posthog.capture('badge_copied', { repo_full_name: fullName });
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer border-2 border-brand-dark shadow-[2px_2px_0px_#222831]"
          >
            Copy Markdown
          </button>
        </div>
      </div>

      {/* Similar Repositories & Alternatives Interlinking (Issue #55) */}
      {relatedRepos.length > 0 && (
        <div className="rounded-2xl bg-white p-4 sm:p-5 border-2 border-brand-dark shadow-[4px_4px_0px_#222831] mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-200">
            <div>
              <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2 font-space">
                <Sparkles className="h-5 w-5 text-emerald-600" /> Similar Welcoming Repositories
              </h3>
              <p className="text-xs text-zinc-600 font-sans mt-0.5">
                Explore alternative open-source projects with high merge rates and active maintainers in{" "}
                <strong className="text-zinc-900">{repo?.language || "this language"}</strong>.
              </p>
            </div>
            {repo?.language && (
              <Link
                href={`/rankings/${getLanguageSlug(repo.language)}`}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 font-sans flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
              >
                View all {repo.language} rankings <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedRepos.map((relRepo) => (
              <RepoCard key={relRepo.id || relRepo.full_name} repo={relRepo} />
            ))}
          </div>
        </div>
      )}

      {/* AI Insights & Maintainer Vibe Check Section */}
      <div className="relative rounded-2xl border-2 border-brand-dark bg-gradient-to-br from-cyan-100 via-white to-emerald-100 p-5 sm:p-6 shadow-[5px_5px_0px_#222831] overflow-hidden mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-brand-dark bg-yellow-200 text-zinc-950 shadow-[2px_2px_0px_#222831] -rotate-2">
            <Sparkles className="h-4 w-4" />
          </div>
          <h2 className="font-space text-base font-extrabold text-zinc-950">
            AI Maintainer Vibe Check & PR Guidelines
          </h2>
        </div>

        {isLoggedIn ? (
          <div className="space-y-6 pt-2 font-sans">
            {/* Persona & Vibe Overview Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border-2 border-brand-dark bg-zinc-950 text-white shadow-[3px_3px_0px_#222831]">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400">
                  HuggingFace Maintainer Persona
                </span>
                <h3 className="text-base font-space font-bold mt-0.5">
                  {insights?.maintainer_persona || "Constructive Code Reviewer"}
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono shrink-0 border-t-2 sm:border-t-0 sm:border-l-2 border-white/30 pt-2 sm:pt-0 sm:pl-4">
                <div>
                  <div className="text-zinc-400 text-[10px]">Warmth Score</div>
                  <div className="text-emerald-400 font-bold text-sm">{insights?.warmth_score ?? 7.8}/10</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">Patience Score</div>
                  <div className="text-blue-400 font-bold text-sm">{insights?.patience_score ?? 8.0}/10</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">Nitpick Rate</div>
                  <div className="text-amber-400 font-bold text-sm">{((insights?.nitpick_ratio ?? 0.25) * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>

            {/* Vibe Check Description */}
            <div className="p-4 rounded-xl border-2 border-brand-dark bg-white shadow-[2px_2px_0px_#222831]">
              <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed">
                {insights?.maintainer_vibe ||
                  "Active maintainer team with regular turnaround times on pull requests. Community guidelines recommend concise PR scopes."}
              </p>
            </div>

            {/* Top Do's & Don'ts Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Do's */}
              <div className="rounded-xl border-2 border-brand-dark bg-emerald-100 p-4 shadow-[3px_3px_0px_#222831]">
                <h4 className="text-xs font-mono font-bold text-emerald-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Top PR Submission Do&apos;s
                </h4>
                <ul className="space-y-2 text-xs text-emerald-950 font-sans">
                  {(insights?.top_dos && insights.top_dos.length > 0 ? insights.top_dos : [
                    "Add unit tests covering modified code paths",
                    "Run package linters before submitting",
                    "Reference open GitHub issue number in description"
                  ]).map((doItem, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{doItem}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Don'ts */}
              <div className="rounded-xl border-2 border-brand-dark bg-rose-100 p-4 shadow-[3px_3px_0px_#222831]">
                <h4 className="text-xs font-mono font-bold text-rose-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  Top PR Friction Pitfalls (Don&apos;ts)
                </h4>
                <ul className="space-y-2 text-xs text-rose-950 font-sans">
                  {(insights?.top_donts && insights.top_donts.length > 0 ? insights.top_donts : [
                    "Do not submit unlinked PRs without referencing an issue",
                    "Do not mix refactoring with new feature commits",
                    "Do not ping maintainers repeatedly within 24 hours"
                  ]).map((dontItem, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>{dontItem}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* General Guidelines */}
            {insights?.pr_guidelines && insights.pr_guidelines.length > 0 && (
              <div className="rounded-xl border-2 border-brand-dark bg-white p-4 shadow-[3px_3px_0px_#222831]">
                <h4 className="text-xs font-mono font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  Maintainer Checklist
                </h4>
                <ul className="space-y-2 text-xs font-mono text-zinc-800">
                  {insights.pr_guidelines.map((guide, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{guide}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="relative pb-10">
            {/* Blurred Content */}
            <div className="space-y-6 blur-[6px] select-none opacity-40 pointer-events-none pb-24">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border-2 border-brand-dark bg-zinc-950 text-white shadow-[3px_3px_0px_#222831]">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400">
                    HuggingFace Maintainer Persona
                  </span>
                  <h3 className="text-base font-space font-bold mt-0.5">
                    Constructive Code Reviewer
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono shrink-0 border-t-2 sm:border-t-0 sm:border-l-2 border-white/30 pt-2 sm:pt-0 sm:pl-4">
                  <div>
                    <div className="text-zinc-400 text-[10px]">Warmth Score</div>
                    <div className="text-emerald-400 font-bold text-sm">X.X/10</div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-[10px]">Patience Score</div>
                    <div className="text-blue-400 font-bold text-sm">X.X/10</div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-[10px]">Nitpick Rate</div>
                    <div className="text-amber-400 font-bold text-sm">XX%</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="rounded-xl border-2 border-brand-dark bg-emerald-100 p-4 shadow-[3px_3px_0px_#222831]">
                  <h4 className="text-xs font-mono font-bold text-emerald-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Top PR Submission Do&apos;s
                  </h4>
                  <ul className="space-y-2 text-xs text-emerald-950 font-sans">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Lorem ipsum dolor sit amet</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Consectetur adipiscing elit</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border-2 border-brand-dark bg-rose-100 p-4 shadow-[3px_3px_0px_#222831]">
                  <h4 className="text-xs font-mono font-bold text-rose-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    Top PR Friction Pitfalls (Don&apos;ts)
                  </h4>
                  <ul className="space-y-2 text-xs text-rose-950 font-sans">
                    <li className="flex items-start gap-2">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>Lorem ipsum dolor sit amet</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>Consectetur adipiscing elit</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Auth Wall Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-brand-dark bg-[#fff8db]/95 backdrop-blur-xs text-center px-4 py-8 rounded-2xl">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border-2 border-brand-dark bg-white mb-3 shadow-[2px_2px_0px_#222831] shrink-0 rotate-2">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-700" />
              </div>
              <h3 className="text-sm sm:text-base font-space font-extrabold text-zinc-950 mb-1.5">
                Unlock Full AI Insights & PR Guidelines
              </h3>
              <p className="text-xs text-zinc-600 max-w-md mb-5 leading-relaxed font-sans">
                Sign in with GitHub to view full PR submission checklists, maintainer review vibe checks, and watch repos for rank shift updates.
              </p>
              <a
                href={`${API_BASE_URL}/api/v1/auth/github`}
                onClick={() => posthog.capture('github_sign_in_clicked', { source: 'ai_insights_wall', repo_full_name: fullName })}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-dark bg-zinc-950 px-5 py-2 sm:px-6 sm:py-2.5 text-xs font-extrabold font-sans text-white shadow-[3px_3px_0px_#222831] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#222831] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#222831] transition-all cursor-pointer"
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
      <div className="rounded-2xl border-2 border-brand-dark bg-gradient-to-br from-orange-100 via-white to-yellow-100 p-5 sm:p-8 shadow-[5px_5px_0px_#222831] mb-10 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b-2 border-brand-dark pb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-space text-zinc-950 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 border-brand-dark bg-blue-200 shadow-[2px_2px_0px_#222831] -rotate-2">
                <Users className="h-5 w-5 text-blue-950 shrink-0" />
              </span>
              Contributor Community Vibe Feedback
            </h2>
            <p className="text-sm text-zinc-600 mt-1 leading-relaxed">
              Rate what actually matters after opening a pull request here.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-sans font-extrabold text-emerald-950 bg-emerald-200 px-3.5 py-1.5 rounded-lg border-2 border-brand-dark shadow-[2px_2px_0px_#222831] shrink-0">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            GitHub Verification Active
          </span>
        </div>

        {/* Interactive Contributor Feedback Form */}
        <div className="rounded-2xl border-2 border-brand-dark bg-white p-5 sm:p-6 shadow-[3px_3px_0px_#222831]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-5">
            <div>
              <h3 className="font-space text-sm font-extrabold text-zinc-950 uppercase tracking-wider">
                Score this repo
              </h3>
              <p className="text-xs text-zinc-600 mt-1">
                Three taps. Comment is optional after ratings.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-lg border-2 border-brand-dark bg-brand-cream px-3 py-1 text-[10px] font-mono font-extrabold text-brand-dark shadow-[2px_2px_0px_#222831]">
              {allFeedbackRatingsSelected ? "Ready to submit" : "3 ratings required"}
            </span>
          </div>

          <div className="space-y-4">
            {[
              {
                label: "Maintainer helpfulness",
                value: maintainerRating,
                setValue: setMaintainerRating,
              },
              {
                label: "Review speed",
                value: reviewSpeedRating,
                setValue: setReviewSpeedRating,
              },
              {
                label: "Beginner friendliness",
                value: beginnerRating,
                setValue: setBeginnerRating,
              },
            ].map((rating) => (
              <div key={rating.label} className="rounded-xl border-2 border-brand-dark bg-[#faf9f6] p-3 shadow-[2px_2px_0px_#222831]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-xs font-mono font-extrabold text-zinc-800 uppercase tracking-wider">
                    {rating.label}
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => rating.setValue(star)}
                        aria-label={`${rating.label}: ${star} star${star === 1 ? "" : "s"}`}
                        className={`rounded-lg border-2 border-brand-dark p-1.5 shadow-[1px_1px_0px_#222831] transition-all cursor-pointer ${
                          rating.value >= star
                            ? "bg-yellow-300 text-zinc-950"
                            : "bg-white text-zinc-300 hover:bg-yellow-100"
                        }`}
                      >
                        <Star className={`h-4 w-4 ${rating.value >= star ? "fill-current" : ""}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {allFeedbackRatingsSelected && (
              <div>
              <label className="block text-xs font-mono font-bold text-zinc-700 uppercase tracking-wider mb-2">
                Optional context
              </label>
              <textarea
                id="feedback-comment"
                rows={3}
                placeholder={`Anything future contributors should know before opening a PR to ${fullName}?`}
                className="w-full text-xs sm:text-sm font-sans rounded-xl border-2 border-brand-dark p-3.5 bg-[#faf9f6] text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-0 shadow-[2px_2px_0px_#222831]"
              />
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  const commentEl = document.getElementById("feedback-comment") as HTMLTextAreaElement;
                  if (!allFeedbackRatingsSelected) {
                    setFeedbackError("Please select all 3 ratings.");
                    return;
                  }
                  if (!isLoggedIn) {
                    openAuthModal(
                      "Submit Repository Ratings",
                      "Sign in with GitHub to verify your contributor signal and submit ratings.",
                      "feedback_submit"
                    );
                    return;
                  }
                  setFeedbackError(null);
                  const avgRating = (maintainerRating + reviewSpeedRating + beginnerRating) / 3;
                  const sentiment = avgRating >= 4 ? "welcoming" : avgRating >= 3 ? "selective" : "unresponsive";
                  const ratingSummary = `Ratings - maintainer helpfulness: ${maintainerRating}/5, review speed: ${reviewSpeedRating}/5, beginner friendliness: ${beginnerRating}/5.`;
                  const optionalComment = commentEl?.value.trim();

                  try {
                    const res = await fetch(`${API_BASE_URL}/api/v1/user/feedback`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        repo_id: repo?.id || "",
                        full_name: fullName,
                        sentiment,
                        comment: optionalComment ? `${ratingSummary}\n\n${optionalComment}` : ratingSummary,
                      }),
                    });
                    if (res.ok) {
                      const result = await res.json();
                      setFeedbackSubmitted(true);
                      if (result.verified_contributor) {
                        setIsVerifiedContributor(true);
                      }
                      if (commentEl) commentEl.value = "";
                      setMaintainerRating(0);
                      setReviewSpeedRating(0);
                      setBeginnerRating(0);
                    } else {
                      setFeedbackError("Please sign in with GitHub to submit feedback.");
                    }
                  } catch (e) {
                    console.error("Failed to submit feedback", e);
                    setFeedbackError("Feedback submission failed. Check network status.");
                  }
                }}
                disabled={!allFeedbackRatingsSelected}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand-dark bg-zinc-950 px-6 py-3 font-mono text-xs font-extrabold text-white shadow-[3px_3px_0px_#222831] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#222831] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#222831] transition-all cursor-pointer"
              >
                Submit Ratings
              </button>

              {feedbackError && (
                <p className="text-xs font-mono text-rose-700 mt-2 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {feedbackError}
                </p>
              )}
              {feedbackSubmitted && (
                <p className="text-xs font-mono text-emerald-700 flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isVerifiedContributor
                    ? "Thanks! Your review has been verified as a contributor."
                    : "Ratings submitted."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content-Heavy SEO Modules for Search Engines & Crawlers */}
      <div className="space-y-8 font-sans border-t-2 border-brand-dark pt-8 text-zinc-800">
        <section className="rounded-2xl border-2 border-brand-dark bg-gradient-to-br from-emerald-100 via-white to-cyan-100 p-5 sm:p-6 shadow-[5px_5px_0px_#222831]">
          <h2 className="text-base sm:text-lg font-extrabold font-space text-zinc-950 mb-3 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-brand-dark bg-emerald-200 shadow-[2px_2px_0px_#222831] rotate-2">
              <Activity className="h-4 w-4 text-emerald-950 shrink-0" />
            </span>
            Contributor Compatibility & Review Speed Analysis for {fullName}
          </h2>
          <div className="rounded-xl border-2 border-brand-dark bg-white p-4 text-zinc-700 leading-relaxed max-w-none space-y-3 font-sans shadow-[3px_3px_0px_#222831]">
            <p>
              When evaluating whether to contribute to <strong className="text-zinc-950">{fullName}</strong>, response velocity and maintainer engagement are crucial. Opendoor continuously tracks pull request trajectories, first-comment latency, and code review rounds to help developers avoid submitting pull requests to backlogged repositories.
            </p>
            <p>
              Currently, maintainers of {fullName} acknowledge new external contributions in approximately{" "}
              <strong className="text-zinc-950">{responseTimeStr}</strong>. Out of all submitted pull requests from non-core authors in the last 180-day window,{" "}
              <strong className="text-zinc-950">{mergeRateStr}</strong> were successfully merged into the primary branch.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border-2 border-brand-dark bg-[#fff8db] p-5 sm:p-6 shadow-[5px_5px_0px_#222831]">
          <h2 className="text-base sm:text-lg font-extrabold font-space text-zinc-950 mb-4 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-brand-dark bg-blue-200 shadow-[2px_2px_0px_#222831] -rotate-2">
              <FileCode2 className="h-4 w-4 text-blue-950 shrink-0" />
            </span>
            Frequently Asked Questions - Contributing to {fullName}
          </h2>
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-brand-dark bg-white p-4 shadow-[3px_3px_0px_#222831]">
              <div className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-brand-dark bg-emerald-200 font-mono text-xs font-extrabold text-emerald-950 shadow-[1px_1px_0px_#222831]">
                  01
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-zinc-950 font-space mb-1.5">
                    Is {fullName} welcoming to first-time open-source contributors?
                  </h3>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                    {fullName} has a recorded first-timer success rate of <strong className="text-zinc-950">{firstTimerSuccessStr}</strong>. Repositories ranked Tier S or Tier A typically have maintainers who provide constructive feedback on initial PRs and label beginner-friendly issues.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border-2 border-brand-dark bg-white p-4 shadow-[3px_3px_0px_#222831]">
              <div className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-brand-dark bg-orange-200 font-mono text-xs font-extrabold text-orange-950 shadow-[1px_1px_0px_#222831]">
                  02
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-zinc-950 font-space mb-1.5">
                    How fast can I expect code review feedback on my pull request?
                  </h3>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                    The initial maintainer response time averages ~<strong className="text-zinc-950">{responseTimeStr}</strong>. Keep your pull requests focused, write clear commit messages, and ensure all CI checks pass to accelerate review speed.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border-2 border-brand-dark bg-white p-4 shadow-[3px_3px_0px_#222831]">
              <div className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-brand-dark bg-pink-200 font-mono text-xs font-extrabold text-pink-950 shadow-[1px_1px_0px_#222831]">
                  03
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-zinc-950 font-space mb-1.5">
                    What does the {score.toFixed(1)} C-Rank™ score represent?
                  </h3>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                    The C-Rank™ system evaluates repositories on a 0 to 100 scale using a weighted sum of external PR merge rate, initial response time, maintainer count, and first-timer success. A score of {score.toFixed(1)} places this project in the <strong className="text-zinc-950">{getRankHumanLabel(rank)}</strong> tier.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border-2 border-brand-dark bg-zinc-950 p-5 sm:p-6 text-white shadow-[5px_5px_0px_#222831]">
          <h2 className="text-xs font-space font-extrabold text-yellow-200 uppercase tracking-wider mb-2">
            Opendoor C-Rank™ Indexing Standard
          </h2>
          <p className="text-xs text-zinc-200 leading-relaxed font-sans">
            All telemetry metrics displayed for {fullName} are automatically retrieved via the GitHub GraphQL API and recalculated daily. Insider pull requests submitted by repository owners or organization members are excluded from merge rate calculations to preserve objective external contributor statistics.
          </p>
        </section>
      </div>

      {/* Auth Modal Component */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title={authModalConfig.title}
        description={authModalConfig.description}
        source={authModalConfig.source}
      />
    </main>
  );
}

function RepoDetailSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8 py-10 sm:py-12 flex-1 w-full overflow-hidden font-sans">
      <div className="h-4 w-28 bg-zinc-200 animate-pulse rounded mb-6" />

      <div className="flex flex-col gap-4 border-b border-zinc-200/40 pb-6 mb-8">
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-zinc-200 animate-pulse rounded-lg" />
          <div className="h-6 w-32 bg-zinc-200 animate-pulse rounded-lg" />
        </div>
        <div className="h-8 w-64 bg-zinc-200 animate-pulse rounded-xl" />
        <div className="h-4 w-96 max-w-full bg-zinc-200 animate-pulse rounded" />
      </div>

      <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] mb-10">
        <div className="h-4 w-48 bg-zinc-200 animate-pulse rounded mb-6" />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-zinc-200 animate-pulse rounded" />
              <div className="h-8 w-24 bg-zinc-200 animate-pulse rounded-lg" />
              <div className="h-3 w-28 bg-zinc-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
        <div className="h-5 w-56 bg-zinc-200 animate-pulse rounded mb-4" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-zinc-200 animate-pulse rounded" />
          <div className="h-4 w-3/4 bg-zinc-200 animate-pulse rounded" />
        </div>
      </div>
    </main>
  );
}
