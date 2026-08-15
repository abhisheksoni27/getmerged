"use client";

import React, { useEffect, useState } from "react";
import { Repo, AIInsights } from "@/types/opendoor";
import {
  ArrowLeft,
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
  Star,
  Award,
  Flame,
  Zap,
  RefreshCw,
  PartyPopper,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { getLanguageSlug } from "@/lib/languageSlug";
import posthog from "posthog-js";
import { AuthModal } from "@/components/AuthModal";
import { RepoDetailHero } from "@/components/RepoDetailHero";
import { RepoScorecards } from "@/components/RepoScorecards";
import { RepoBadgeGenerator } from "@/components/RepoBadgeGenerator";
import { SimilarRepos } from "@/components/SimilarRepos";

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
  const [badgeCopied, setBadgeCopied] = useState(false);
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
  const [submittedScores, setSubmittedScores] = useState<{
    maintainer: number;
    speed: number;
    beginner: number;
    comment: string;
    avg: number;
  } | null>(null);

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
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12 flex-1 w-full font-sans">
          <Link
            href="/"
            title="Return to Opendoor Explorer Home"
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
                title="Return to Opendoor Explorer Home"
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
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12 flex-1 w-full font-sans">
        <Link
          href="/"
          title="Return to Opendoor Explorer Home"
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





  const responseTimeVal = repo?.time_to_first_response_hours || 0;
  const responseScore = responseTimeVal > 0 ? Math.max(0, 100 - (responseTimeVal * 2.5)) : 0;
  const mergeScore = repo?.external_pr_merge_rate || 0;
  const firstTimerScore = repo?.first_timer_success_rate || 0;
  const compositeScore = (mergeScore * 0.4) + (responseScore * 0.3) + (firstTimerScore * 0.3);
  const vibeScore = Math.round(compositeScore);

  const distinctMaintainers = repo?.distinct_maintainer_count !== undefined ? repo.distinct_maintainer_count : 0;
  const maintainersCommentary = distinctMaintainers > 5
    ? "Highly collaborative maintainer core"
    : distinctMaintainers > 1
    ? "Small core review team"
    : distinctMaintainers === 1
    ? "Single maintainer review bottleneck"
    : "No active GitHub maintainers found (may review internally on Gerrit or internal tools)";

  return (
    <main className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-10 sm:py-12 flex-1 w-full overflow-hidden">
      {/* Navigation Breadcrumb */}
      <Link
        href="/"
        title="Return to Opendoor Explorer Home"
        className="inline-flex items-center gap-1.5 text-xs font-sans text-zinc-500 hover:text-zinc-900 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Explorer
      </Link>

      {/* Hero Header */}
      <RepoDetailHero
        fullName={fullName}
        repo={repo}
        rank={rank}
        rankLabel={getRankHumanLabel(rank)}
        isWatching={isWatching}
        watchLoading={watchLoading}
        onWatchToggle={handleWatchToggle}
        onGithubClick={() => posthog.capture('repo_github_link_clicked', { repo_full_name: fullName, repo_tier: rank })}
      />

      {/* Macro Metrics Grid & cNPS Gauge Row */}
      <RepoScorecards
        responseTimeStr={responseTimeStr}
        responseCommentary={responseCommentary}
        mergeRateStr={mergeRateStr}
        mergeCommentary={mergeCommentary}
        firstTimerSuccessStr={firstTimerSuccessStr}
        firstTimerCommentary={firstTimerCommentary}
        distinctMaintainers={distinctMaintainers}
        maintainersCommentary={maintainersCommentary}
        vibeScore={vibeScore}
      />

      {/* Interactive README C-Rank Live Badge Generator (Issue #50) */}
      <RepoBadgeGenerator
        fullName={fullName}
        badgeShowPoints={badgeShowPoints}
        setBadgeShowPoints={setBadgeShowPoints}
        badgeColor={badgeColor}
        setBadgeColor={setBadgeColor}
        badgePreviewUrl={badgePreviewUrl}
        badgeMarkdownUrl={badgeMarkdownUrl}
        badgeCopied={badgeCopied}
        setBadgeCopied={setBadgeCopied}
      />

      {/* Similar Repositories & Alternatives Interlinking (Issue #55) */}
      <SimilarRepos relatedRepos={relatedRepos} language={repo?.language} />

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
                  title={`Explore all ${repo.language} Good First Issues on Opendoor`}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 font-sans inline-flex items-center gap-1 hover:underline"
                >
                  Explore all {repo.language} Good First Issues <ArrowRight className="h-3.5 w-3.5" />
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
                  title={`Browse open ${repo.language} beginner tasks across other projects`}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 font-sans inline-flex items-center gap-1 hover:underline"
                >
                  Browse open {repo.language} Good First Issues across other repos <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic README Badge Embed (F1) */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 border-2 border-brand-dark shadow-[4px_4px_0px_#222831] mb-6 font-mono">
        <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2 mb-2 font-space">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Embed OpenDoor Badge on your Repo/Profile
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
              <option value="auto">Default</option>
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
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl shadow-2xs">
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
              setBadgeCopied(true);
              setTimeout(() => setBadgeCopied(false), 2000);
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white font-semibold text-xs shrink-0 transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-2"
          >
            {badgeCopied ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                <Check className="h-3.5 w-3.5" /> Copied Markdown!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Copy Markdown
              </span>
            )}
          </button>
        </div>
      </div>



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
                  Maintainer Persona
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
          <div className="relative pb-4">
            {/* Real SEO-crawlable semantic content rendered behind a translucent FOMO glass overlay */}
            <div className="space-y-6 select-none transition-all duration-300 filter blur-[3.5px] opacity-60 pointer-events-none" aria-hidden="true">
              {/* Persona & Vibe Preview Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border-2 border-brand-dark bg-zinc-950 text-white shadow-[3px_3px_0px_#222831]">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400">
                    Maintainer Persona
                  </span>
                  <h3 className="text-base font-space font-bold mt-0.5">
                    {insights?.maintainer_persona || `${fullName.split("/")[1] || "Core"} Maintainer Review Team`}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono shrink-0 border-t-2 sm:border-t-0 sm:border-l-2 border-white/30 pt-2 sm:pt-0 sm:pl-4">
                  <div>
                    <div className="text-zinc-400 text-[10px]">Warmth Score</div>
                    <div className="text-emerald-400 font-bold text-sm">8.4/10</div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-[10px]">Patience Score</div>
                    <div className="text-blue-400 font-bold text-sm">8.1/10</div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-[10px]">Nitpick Rate</div>
                    <div className="text-amber-400 font-bold text-sm">18%</div>
                  </div>
                </div>
              </div>

              {/* Vibe Check Description Preview */}
              <div className="p-4 rounded-xl border-2 border-brand-dark bg-white shadow-[2px_2px_0px_#222831]">
                <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed">
                  {insights?.maintainer_vibe ||
                    `Maintainers actively monitor pull requests with rapid initial triage. Code reviews focus heavily on automated test suite coverage, minimal diff sizes, and direct adherence to repo architecture.`}
                </p>
              </div>

              {/* Top Do's & Don'ts Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Do's */}
                <div className="rounded-xl border-2 border-brand-dark bg-emerald-100/90 p-4 shadow-[3px_3px_0px_#222831]">
                  <h4 className="text-xs font-mono font-bold text-emerald-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Top PR Submission Do&apos;s
                  </h4>
                  <ul className="space-y-2 text-xs text-emerald-950 font-sans">
                    {(insights?.top_dos && insights.top_dos.length > 0 ? insights.top_dos : [
                      "Verify clean test suite passes locally before opening PR",
                      "Keep pull request branch synced with latest main upstream",
                      "Provide reproduction steps and context in PR description"
                    ]).map((doItem, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{doItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Don'ts */}
                <div className="rounded-xl border-2 border-brand-dark bg-rose-100/90 p-4 shadow-[3px_3px_0px_#222831]">
                  <h4 className="text-xs font-mono font-bold text-rose-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    Top PR Friction Pitfalls (Don&apos;ts)
                  </h4>
                  <ul className="space-y-2 text-xs text-rose-950 font-sans">
                    {(insights?.top_donts && insights.top_donts.length > 0 ? insights.top_donts : [
                      "Do not open unlinked PRs without referencing an issue",
                      "Do not introduce unrelated formatting or cosmetic diffs",
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
            </div>

            {/* Translucent FOMO Glassmorphism Gate Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-brand-dark bg-amber-50/75 backdrop-blur-[2px] p-6 sm:p-8 text-center shadow-[inset_0_0_20px_rgba(251,191,36,0.15)]">
              <div className="relative mb-3">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border-2 border-brand-dark bg-yellow-300 text-zinc-950 shadow-[3px_3px_0px_#222831] -rotate-3 hover:rotate-0 transition-transform">
                  <Sparkles className="h-6 w-6 text-zinc-950 fill-yellow-100" />
                </div>
                <span className="absolute -top-1 -right-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white uppercase tracking-wider border border-brand-dark shadow-xs">
                  Exclusive
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-brand-dark bg-white text-[11px] font-mono font-extrabold text-zinc-900 uppercase tracking-wider mb-2 shadow-[2px_2px_0px_#222831]">
                <Lock className="h-3 w-3 text-amber-600 inline" /> Contributor Intelligence Gated
              </div>

              <h3 className="text-lg sm:text-xl font-space font-extrabold text-zinc-950 mb-2 tracking-tight">
                Unlock Full AI Maintainer Vibe Check & Dos/Don&apos;ts
              </h3>

              <p className="text-xs sm:text-sm text-zinc-700 max-w-lg mb-5 leading-relaxed font-sans">
                Get insider triage tips, strict maintainer preferences, and custom PR acceptance rules for <strong className="text-zinc-950">{fullName}</strong> before you write code.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={`${API_BASE_URL}/api/v1/auth/github`}
                  onClick={() => posthog.capture('github_sign_in_clicked', { source: 'ai_insights_wall', repo_full_name: fullName })}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-dark bg-zinc-950 px-6 py-2.5 text-xs font-extrabold font-sans text-white shadow-[3px_3px_0px_#222831] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#222831] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#222831] transition-all cursor-pointer"
                >
                  <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Sign in with GitHub (Free)
                </a>

                <span className="text-[11px] font-mono text-zinc-500">
                  Takes 3 seconds • 1-click OAuth
                </span>
              </div>
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

        {/* Interactive Contributor Feedback Form / Thank You Widget */}
        <div className="rounded-2xl border-2 border-brand-dark bg-white p-5 sm:p-6 shadow-[3px_3px_0px_#222831] overflow-hidden relative">
          {feedbackSubmitted && submittedScores ? (
            <div className="relative overflow-hidden rounded-xl border-2 border-brand-dark p-6 sm:p-8 animate-in zoom-in-95 duration-500 transition-all">
              {/* Dynamic Theme Gradients & Floating Particles Based on Rating */}
              {submittedScores.avg >= 4.5 ? (
                // S-TIER / GODLIKE CELEBRATION (Golden/Emerald Rainbow)
                <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-yellow-100 to-emerald-200 opacity-90 -z-10" />
              ) : submittedScores.avg >= 3.5 ? (
                // GREAT VIBES (Emerald & Cyan Sparkle)
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-teal-50 to-blue-100 opacity-90 -z-10" />
              ) : submittedScores.avg >= 2.5 ? (
                // BALANCED / NEUTRAL (Electric Violet & Amber)
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-amber-50 to-orange-100 opacity-90 -z-10" />
              ) : (
                // SPICY / CRITICAL (Crimson Warning Pulse)
                <div className="absolute inset-0 bg-gradient-to-br from-rose-100 via-orange-100 to-amber-100 opacity-90 -z-10" />
              )}

              {/* Floating Funky Emojis & Particle Burst */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
                <span className="absolute top-2 left-6 text-2xl animate-bounce duration-1000">
                  {submittedScores.avg >= 4.5 ? "✨" : submittedScores.avg >= 3.5 ? "🚀" : submittedScores.avg >= 2.5 ? "⚡" : "🔥"}
                </span>
                <span className="absolute top-4 right-8 text-2xl animate-spin duration-3000">
                  {submittedScores.avg >= 4.5 ? "👑" : submittedScores.avg >= 3.5 ? "🎉" : "💡"}
                </span>
                <span className="absolute bottom-3 left-10 text-xl animate-pulse">
                  {submittedScores.avg >= 4.5 ? "⭐" : "🎯"}
                </span>
                <span className="absolute bottom-4 right-12 text-2xl animate-bounce">
                  {submittedScores.avg >= 4.5 ? "🌟" : "🦾"}
                </span>
              </div>

              {/* Main Badge & Title */}
              <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                <div className="relative">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-3 border-brand-dark bg-white shadow-[4px_4px_0px_#222831] flex items-center justify-center -rotate-3 hover:rotate-0 transition-transform">
                    {submittedScores.avg >= 4.5 ? (
                      <Flame className="h-9 w-9 sm:h-11 sm:w-11 text-amber-500 animate-pulse fill-amber-400" />
                    ) : submittedScores.avg >= 3.5 ? (
                      <PartyPopper className="h-9 w-9 sm:h-11 sm:w-11 text-emerald-600 animate-bounce" />
                    ) : submittedScores.avg >= 2.5 ? (
                      <Zap className="h-9 w-9 sm:h-11 sm:w-11 text-indigo-600" />
                    ) : (
                      <Award className="h-9 w-9 sm:h-11 sm:w-11 text-rose-600" />
                    )}
                  </div>
                  {isVerifiedContributor && (
                    <span className="absolute -bottom-2 -right-2 rounded-full bg-emerald-500 p-1 border-2 border-brand-dark shadow-sm text-white" title="Verified Contributor Badge">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-brand-dark bg-white text-[11px] font-mono font-extrabold uppercase tracking-wider shadow-[2px_2px_0px_#222831]">
                    {submittedScores.avg >= 4.5
                      ? "🏆 Legendary Maintainer Vibes"
                      : submittedScores.avg >= 3.5
                      ? "🌟 Super Welcoming Project"
                      : submittedScores.avg >= 2.5
                      ? "⚖️ Selective & Strict Reviews"
                      : "🚨 Tough Onboarding Curve"}
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold font-space text-zinc-950 tracking-tight">
                    Thank You for Scoring {fullName.split("/")[1] || fullName}!
                  </h3>

                  <p className="text-xs sm:text-sm font-sans text-zinc-700 max-w-md mx-auto leading-relaxed">
                    {isVerifiedContributor
                      ? "🎖️ Verified Contributor match! Your scores carry 3x weight on the maintainer leaderboard."
                      : "Your review has been broadcasted and factored into the global C-Rank™ community algorithm."}
                  </p>
                </div>

                {/* Scorecard Visual Breakdown */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-md pt-2">
                  <div className="rounded-xl border-2 border-brand-dark bg-white/90 backdrop-blur-xs p-2.5 sm:p-3 text-center shadow-[2px_2px_0px_#222831]">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">Helpfulness</span>
                    <span className="text-base sm:text-lg font-space font-extrabold text-zinc-950 flex items-center justify-center gap-1 mt-0.5">
                      {submittedScores.maintainer} <Star className="h-3 w-3 fill-yellow-400 text-brand-dark inline" />
                    </span>
                  </div>
                  <div className="rounded-xl border-2 border-brand-dark bg-white/90 backdrop-blur-xs p-2.5 sm:p-3 text-center shadow-[2px_2px_0px_#222831]">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">Speed</span>
                    <span className="text-base sm:text-lg font-space font-extrabold text-zinc-950 flex items-center justify-center gap-1 mt-0.5">
                      {submittedScores.speed} <Star className="h-3 w-3 fill-yellow-400 text-brand-dark inline" />
                    </span>
                  </div>
                  <div className="rounded-xl border-2 border-brand-dark bg-white/90 backdrop-blur-xs p-2.5 sm:p-3 text-center shadow-[2px_2px_0px_#222831]">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">Beginner</span>
                    <span className="text-base sm:text-lg font-space font-extrabold text-zinc-950 flex items-center justify-center gap-1 mt-0.5">
                      {submittedScores.beginner} <Star className="h-3 w-3 fill-yellow-400 text-brand-dark inline" />
                    </span>
                  </div>
                </div>

                {/* Optional Comment Display if provided */}
                {submittedScores.comment && (
                  <div className="w-full max-w-md rounded-xl border-2 border-brand-dark bg-white/80 p-3 text-left shadow-[2px_2px_0px_#222831]">
                    <span className="text-[10px] font-mono uppercase font-bold text-zinc-500 block mb-1">Your review note:</span>
                    <p className="text-xs font-sans text-zinc-800 italic">
                      &quot;{submittedScores.comment}&quot;
                    </p>
                  </div>
                )}

                {/* Reset / Edit Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackSubmitted(false);
                      setMaintainerRating(submittedScores.maintainer);
                      setReviewSpeedRating(submittedScores.speed);
                      setBeginnerRating(submittedScores.beginner);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-dark bg-white px-4 py-2 text-xs font-mono font-bold text-zinc-900 shadow-[2px_2px_0px_#222831] hover:bg-zinc-50 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Update or Edit Ratings
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-5">
                <div>
                  <h3 className="font-space text-sm font-extrabold text-zinc-950 uppercase tracking-wider">
                    Score this repo
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1">
                    Three taps.
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
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-zinc-900">
                        {rating.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => rating.setValue(star)}
                            aria-label={`${rating.label}: ${star} star${star === 1 ? "" : "s"}`}
                            className={`rounded-lg border-2 border-brand-dark p-1.5 shadow-[1px_1px_0px_#222831] transition-all cursor-pointer ${
                              rating.value >= star
                                ? "bg-yellow-300 text-zinc-950 scale-105"
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
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
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
                      const optionalComment = commentEl?.value.trim() || "";

                      try {
                        const res = await fetch(`${API_BASE_URL}/api/v1/user/feedback`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            repo_id: repo?.id || "",
                            full_name: fullName,
                            maintainer_rating: maintainerRating,
                            review_speed_rating: reviewSpeedRating,
                            beginner_rating: beginnerRating,
                            comment: optionalComment,
                          }),
                        });
                        if (res.ok) {
                          const result = await res.json();
                          const avg = (maintainerRating + reviewSpeedRating + beginnerRating) / 3;
                          setSubmittedScores({
                            maintainer: maintainerRating,
                            speed: reviewSpeedRating,
                            beginner: beginnerRating,
                            comment: optionalComment,
                            avg,
                          });
                          setFeedbackSubmitted(true);
                          if (result.verified_contributor) {
                            setIsVerifiedContributor(true);
                          }
                          if (commentEl) commentEl.value = "";
                        } else {
                          const err = await res.json().catch(() => ({}));
                          setFeedbackError(err?.error || "Feedback submission failed.");
                        }
                      } catch (e) {
                        console.error("Failed to submit feedback", e);
                        setFeedbackError("Feedback submission failed. Check network status.");
                      }
                    }}
                    disabled={!allFeedbackRatingsSelected}
                    className="flex ml-auto items-center justify-center gap-2 rounded-xl border-2 border-brand-dark bg-zinc-950 px-6 py-3 font-mono text-xs font-extrabold text-white shadow-[3px_3px_0px_#222831] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#222831] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#222831] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Ratings
                  </button>

                  {feedbackError && (
                    <p className="text-xs font-mono text-rose-700 mt-2 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {feedbackError}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
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
          <div className="space-y-3.5">
            {/* FAQ 1 */}
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
                    {fullName} has a recorded first-timer success rate of <strong className="text-zinc-950">{firstTimerSuccessStr}</strong>. Repositories ranked {getRankHumanLabel(rank)} typically provide actionable feedback during code reviews and actively nurture new community contributors.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ 2 */}
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
                    The initial maintainer response time averages ~<strong className="text-zinc-950">{responseTimeStr}</strong>. Keeping PRs scoped to single concerns and ensuring CI checks succeed will optimize review turnaround.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ 3 */}
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
                    The C-Rank™ index scores repositories on a 0 to 100 scale using an objective formula: external PR merge rates, initial response speed, active maintainer count, and first-time contributor retention. A score of {score.toFixed(1)} places {fullName} in the <strong className="text-zinc-950">{getRankHumanLabel(rank)}</strong> tier.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ 4 */}
            <div className="rounded-xl border-2 border-brand-dark bg-white p-4 shadow-[3px_3px_0px_#222831]">
              <div className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-brand-dark bg-yellow-200 font-mono text-xs font-extrabold text-yellow-950 shadow-[1px_1px_0px_#222831]">
                  04
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-zinc-950 font-space mb-1.5">
                    What is the external contributor pull request merge rate for {fullName}?
                  </h3>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                    The external pull request merge rate is <strong className="text-zinc-950">{mergeRateStr}</strong>. Opendoor isolates non-core community contributions so external developers get an accurate benchmark of PR acceptance probability.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ 5 */}
            <div className="rounded-xl border-2 border-brand-dark bg-white p-4 shadow-[3px_3px_0px_#222831]">
              <div className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-brand-dark bg-cyan-200 font-mono text-xs font-extrabold text-cyan-950 shadow-[1px_1px_0px_#222831]">
                  05
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-zinc-950 font-space mb-1.5">
                    Are there beginner Good First Issues open in {fullName}?
                  </h3>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                    {(repo?.good_first_issue_count || 0) > 0 ? (
                      <>
                        Yes, {fullName} currently has <strong className="text-zinc-950">{repo?.good_first_issue_count}</strong> active issue(s) tagged with beginner-friendly labels. You can inspect these directly from the repository issues tab.
                      </>
                    ) : (
                      <>
                        {fullName} does not have open beginner labels indexed currently, but external PRs for bugs and documentation improvements are evaluated via normal issue triage.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ 6 */}
            <div className="rounded-xl border-2 border-brand-dark bg-white p-4 shadow-[3px_3px_0px_#222831]">
              <div className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-brand-dark bg-purple-200 font-mono text-xs font-extrabold text-purple-950 shadow-[1px_1px_0px_#222831]">
                  06
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-zinc-950 font-space mb-1.5">
                    How many distinct maintainers review contributions in {fullName}?
                  </h3>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                    Telemetry shows approximately <strong className="text-zinc-950">{repo?.distinct_maintainer_count || 1}</strong> distinct maintainer(s) actively participating in code review rounds, discussions, and commit merges.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ 7 */}
            <div className="rounded-xl border-2 border-brand-dark bg-white p-4 shadow-[3px_3px_0px_#222831]">
              <div className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-brand-dark bg-lime-200 font-mono text-xs font-extrabold text-lime-950 shadow-[1px_1px_0px_#222831]">
                  07
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-zinc-950 font-space mb-1.5">
                    How long does it typically take for a PR to be merged into {fullName}?
                  </h3>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                    On average, merged pull requests spend ~<strong className="text-zinc-950">{(repo?.time_to_merge_hours || 24.0).toFixed(1)} hours</strong> in review and CI testing before being merged into the primary branch.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ 8 */}
            <div className="rounded-xl border-2 border-brand-dark bg-white p-4 shadow-[3px_3px_0px_#222831]">
              <div className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-brand-dark bg-indigo-200 font-mono text-xs font-extrabold text-indigo-950 shadow-[1px_1px_0px_#222831]">
                  08
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-zinc-950 font-space mb-1.5">
                    What programming language and ecosystem does {fullName} belong to?
                  </h3>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                    {fullName} is developed in <strong className="text-zinc-950">{repo?.language || "Open Source"}</strong> with {repo?.stars?.toLocaleString() || "multiple"} stars. Contributing helps build verified public commits for your developer portfolio.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ 9 */}
            <div className="rounded-xl border-2 border-brand-dark bg-white p-4 shadow-[3px_3px_0px_#222831]">
              <div className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-brand-dark bg-teal-200 font-mono text-xs font-extrabold text-teal-950 shadow-[1px_1px_0px_#222831]">
                  09
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-zinc-950 font-space mb-1.5">
                    How can I maximize my PR acceptance rate for {fullName}?
                  </h3>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                    Always link an existing GitHub issue in your PR body, write clean automated unit tests, keep pull request diffs small and focused, and run local linters prior to submission.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ 10 */}
            <div className="rounded-xl border-2 border-brand-dark bg-white p-4 shadow-[3px_3px_0px_#222831]">
              <div className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-brand-dark bg-rose-200 font-mono text-xs font-extrabold text-rose-950 shadow-[1px_1px_0px_#222831]">
                  10
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-zinc-950 font-space mb-1.5">
                    Is {fullName} actively maintained or at risk of staleness?
                  </h3>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                    {repo?.staleness_flag ? (
                      <>
                        {fullName} has experienced lower commit and PR turnaround activity over the past 90 days. Contributors should verify maintainer responsiveness on open issues before starting major contributions.
                      </>
                    ) : (
                      <>
                        {fullName} is actively maintained with frequent PR reviews, continuous telemetry updates, and regular maintainer feedback.
                      </>
                    )}
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
    <main className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-10 sm:py-12 flex-1 w-full overflow-hidden font-sans">
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
