"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { AuthModal } from "@/components/AuthModal";
import {
  Trophy,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Star,
  Flame,
  Share2,
  ShieldCheck,
  Zap,
} from "lucide-react";

export interface LeaderboardRepo {
  id: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stars: number;
  c_rank_tier: string;
  c_rank_score: number;
  gfi_quality_score: number;
  gfi_count: number;
  first_timer_success_rate: number;
  welcome_badge: boolean;
}

interface StoredMerge {
  pr_id: string;
  repository_id: string;
  pr_number: number;
  title: string;
  html_url: string;
  merged_at: string | null;
}

interface ProgressResponse {
  year: number;
  target: number;
  merged_count: number;
  total_qualifying: number;
  card_issued: boolean;
  last_checked_at: string | null;
  cached: boolean;
  limited: boolean;
  reconnect_required: boolean;
  connection: string;
  card: {
    card_id: string;
    share_url: string;
    og_image_url: string;
  } | null;
  merges: StoredMerge[];
  updated_ago_min?: number;
  retry_after_sec?: number;
}

export function HacktoberfestClient({ initialRepos }: { initialRepos: LeaderboardRepo[] }) {
  const [repos] = useState<LeaderboardRepo[]>(initialRepos);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);

  const lastNudgeTimeRef = useRef<number>(0);

  const fetchProgress = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/hacktoberfest/progress`, {
        credentials: "include",
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (res.ok) {
        setIsAuthenticated(true);
        const data: ProgressResponse = await res.json();
        setProgress(data);
      }
    } catch (e) {
      console.error("Failed to fetch Hacktoberfest progress:", e);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  const triggerNudge = useCallback(async () => {
    const now = Date.now();
    // Throttle client-side nudge triggers to <= 1 per minute (AC3)
    if (now - lastNudgeTimeRef.current < 60000) {
      return;
    }
    lastNudgeTimeRef.current = now;
    setIsNudging(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hacktoberfest/nudge`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data: ProgressResponse = await res.json();
        setProgress(data);
      }
    } catch (e) {
      console.error("Failed to nudge Hacktoberfest progress:", e);
    } finally {
      setIsNudging(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on page load (AC2, AC3)
    fetchProgress(true);

    // AC2/AC5: Poll every 5 minutes while the tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchProgress(false);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchProgress]);

  // Connect to PR merge eventstream for display hints (AC2, AC3)
  useEffect(() => {
    if (!isAuthenticated) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${API_BASE_URL}/api/v1/eventstream`, {
        withCredentials: true,
      });

      eventSource.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          // Stream event is display-hint only, triggers throttled re-poll (AC2, AC3)
          if (payload?.type === "pr_merged" || payload?.type === "pr_update" || payload?.action === "merged") {
            triggerNudge();
          }
        } catch {
          // ignore non-json keepalives
        }
      };

      eventSource.onerror = () => {
        // SSE fallback: safely closes and relies on 5-min lazy poll (AC2)
        if (eventSource) {
          eventSource.close();
        }
      };
    } catch (e) {
      console.warn("EventSource setup skipped:", e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isAuthenticated, triggerNudge]);

  const handleCopyShareLink = async (shareUrl: string) => {
    const fullUrl = `${window.location.origin}${shareUrl}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      }
      setCopiedCard(true);
      setTimeout(() => setCopiedCard(false), 2500);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
    }
  };

  const getBadgeStyle = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case "S":
        return "bg-emerald-600 text-white border border-white/[0.08] font-bold";
      case "A":
        return "bg-blue-600 text-white border border-white/[0.08] font-bold";
      case "B":
        return "bg-amber-600 text-white border border-white/[0.08] font-bold";
      default:
        return "bg-zinc-900 text-zinc-200 border border-white/[0.12]";
    }
  };

  const mergedCount = progress?.merged_count ?? 0;
  const target = progress?.target ?? 4;
  const progressPercent = Math.min(100, Math.round((mergedCount / target) * 100));

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div className="rounded-3xl bg-zinc-900/80 p-6 sm:p-10 border border-white/[0.08] shadow-xs">
        <div className="flex flex-wrap items-center gap-2 mb-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-1 text-xs font-semibold text-white font-mono shadow-xs">
            <Flame className="h-3.5 w-3.5" /> Hacktoberfest 2026 Welcome Hub
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1 text-xs font-semibold text-white font-mono shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" /> C-Rank™ S/A/B Rated
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-space">
          Hacktoberfest 2026 Welcome Hub
        </h1>
        <p className="mt-3 text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed font-sans">
          Discover verified newcomer-welcoming repositories with responsive maintainers and track your live{" "}
          <strong>4 pull request merges</strong> in real time.
        </p>
      </div>

      {/* Reconnect / Re-auth Banner (AC6) */}
      {progress?.reconnect_required && (
        <div className="rounded-2xl bg-amber-950/70 border-amber-800/80 border border-amber-300 p-4 sm:p-6 text-amber-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold font-space">GitHub OAuth Token Expired or Revoked</h3>
              <p className="text-xs text-amber-300 mt-0.5">
                Your merge count is frozen with your last known verified total. Re-authenticate with GitHub to resume live syncing.
              </p>
            </div>
          </div>
          <Link
            href="/api/v1/auth/github"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shrink-0 shadow-xs"
          >
            Re-authenticate GitHub
          </Link>
        </div>
      )}

      {/* Live Merge Progress Tracker (AC1-AC6, AC8) */}
      <div className="rounded-3xl bg-zinc-900/80 p-6 sm:p-8 border border-white/[0.08] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg sm:text-xl font-bold text-white font-space">
                Live Merge Progress Tracker
              </h2>
            </div>
            <p className="text-xs text-zinc-300 mt-1">
              Validates pull requests to public repositories merged between Oct 1–31 UTC (no spam/invalid labels).
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => triggerNudge()}
                disabled={isNudging}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] text-xs font-mono text-zinc-300 hover:bg-zinc-900 disabled:opacity-50 transition-all cursor-pointer shadow-2xs"
                title="Force refresh against GitHub search API (throttled to 1/min)"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isNudging ? "animate-spin text-orange-600" : ""}`} />
                <span>{isNudging ? "Checking..." : "Check Merges"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
              >
                <span>Connect GitHub to Track</span>
              </button>
            )}
          </div>
        </div>

        {isAuthenticated === false && !loading && (
          <div className="py-12 text-center">
            <div className="inline-flex p-3 rounded-2xl bg-orange-50 text-orange-600 mb-3">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white font-space">Track Your 4 Hacktoberfest PRs</h3>
            <p className="text-xs text-zinc-300 max-w-md mx-auto mt-1 mb-4">
              Sign in with your GitHub account to automatically monitor your merged PRs and unlock your verified completion badge.
            </p>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
            >
              Sign in with GitHub
            </button>
          </div>
        )}

        {isAuthenticated && (
          <div className="mt-6 space-y-6">
            {/* Progress Bar and Big Counter */}
            <div className="bg-zinc-900 rounded-2xl p-6 border border-white/[0.08]/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-bold font-space text-white">
                      {mergedCount}
                    </span>
                    <span className="text-lg font-bold text-zinc-300 font-space">
                      of {target} PRs Merged
                    </span>
                    {progress?.total_qualifying && progress.total_qualifying > 4 ? (
                      <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/80 border-emerald-800/80 px-2 py-0.5 rounded-md ml-2">
                        +{progress.total_qualifying - 4} extra qualifying PRs
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-300 mt-1 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    <span>
                      {progress?.updated_ago_min !== undefined
                        ? `Updated ${progress.updated_ago_min}m ago (5-min cache)`
                        : "Live synced with GitHub search"}
                    </span>
                    {progress?.limited && (
                      <span className="text-amber-600 bg-amber-950/70 border-amber-800/80 px-1.5 py-0.5 rounded border border-amber-200">
                        Rate-limit backoff active
                      </span>
                    )}
                  </div>
                </div>

                {progress?.card_issued && progress?.card && (
                  <div className="flex items-center gap-2">
                    <Link
                      href={progress.card.share_url}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      <Trophy className="h-3.5 w-3.5 text-amber-300" />
                      View Completion Card
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleCopyShareLink(progress.card!.share_url)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-xs font-mono text-zinc-300 hover:bg-zinc-900 transition-colors shadow-2xs cursor-pointer"
                      title="Copy Share Link"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>{copiedCard ? "Copied!" : "Share"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Progress Track */}
              <div className="w-full bg-zinc-200 h-3 rounded-full overflow-hidden">
                <div
                  className="glass-panel h-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* 4 Step Milestones */}
              <div className="grid grid-cols-4 gap-2 mt-4 text-center font-mono text-xs">
                {[1, 2, 3, 4].map((step) => {
                  const isDone = mergedCount >= step;
                  return (
                    <div
                      key={step}
                      className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        isDone
                          ? "bg-emerald-950/70 border-emerald-800/80 border-emerald-300 text-emerald-300 font-bold"
                          : "bg-zinc-900/80 border-white/[0.08] text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-white/[0.12] flex items-center justify-center text-[9px]">
                            {step}
                          </div>
                        )}
                        <span>PR #{step}</span>
                      </div>
                      <span className="text-[10px] font-normal">
                        {isDone ? "Merged" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Merged PR List */}
            {progress?.merges && progress.merges.length > 0 && (
              <div>
                <h4 className="text-xs font-mono uppercase font-semibold text-zinc-300 mb-3 tracking-wider">
                  Verified Qualifying Merges
                </h4>
                <div className="divide-y divide-zinc-100 rounded-2xl border border-white/[0.08] overflow-hidden bg-zinc-900/80">
                  {progress.merges.map((merge) => (
                    <div
                      key={merge.pr_id}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-zinc-900/70 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="font-space text-xs sm:text-sm font-bold text-white truncate">
                            {merge.title || merge.pr_id}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-300 mt-1 flex items-center gap-2">
                          <span>{merge.repository_id}</span>
                          <span>•</span>
                          <span>PR #{merge.pr_number}</span>
                          {merge.merged_at && (
                            <>
                              <span>•</span>
                              <span>Merged {new Date(merge.merged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {merge.html_url && (
                        <a
                          href={merge.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-zinc-300 hover:text-white transition-colors shrink-0"
                        >
                          <span>GitHub</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Welcoming Repo Leaderboard (AC7) */}
      <div className="rounded-3xl bg-zinc-900/80 p-6 sm:p-8 border border-white/[0.08] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg sm:text-xl font-bold text-white font-space">
                Top Welcoming Repositories
              </h2>
            </div>
            <p className="text-xs text-zinc-300 mt-1">
              Ranked by <strong>C-Rank™ (S/A/B)</strong> and <strong>Good First Issue quality</strong>. Repositories with &gt;60% first-timer merge rates are highlighted with the Welcoming badge.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] shadow-xs">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900 text-zinc-200 border-b border-white/[0.08] font-semibold uppercase tracking-wider font-space text-[11px]">
              <tr>
                <th className="py-3.5 px-4 text-center">Rank</th>
                <th className="py-3.5 px-4">Repository</th>
                <th className="py-3.5 px-4 text-center">Tier</th>
                <th className="py-3.5 px-4 text-right">GFI Quality</th>
                <th className="py-3.5 px-4 text-right">First-Timer Rate</th>
                <th className="py-3.5 px-4 text-right">Stars</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono">
              {repos.map((repo, idx) => {
                const [owner, name] = repo.full_name.split("/");
                return (
                  <tr key={repo.id} className="hover:bg-zinc-900/60 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-300">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/${owner}/${name}`}
                          className="hover:text-orange-600 transition-colors font-space text-sm font-bold text-white"
                        >
                          {repo.full_name}
                        </Link>
                        {repo.welcome_badge && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border-emerald-800/80 border border-emerald-300 text-emerald-300 text-[10px] font-bold font-sans">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            Welcoming ({repo.first_timer_success_rate.toFixed(0)}%)
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <div className="text-[11px] font-normal text-zinc-300 font-sans truncate max-w-md mt-0.5">
                          {repo.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] ${getBadgeStyle(repo.c_rank_tier)}`}>
                        {repo.c_rank_tier} Rank
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        {repo.gfi_quality_score ? `${repo.gfi_quality_score}/100` : "N/A"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-300">
                      {repo.first_timer_success_rate ? `${repo.first_timer_success_rate.toFixed(1)}%` : "0.0%"}
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-300">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                        {repo.stars.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href={`/${owner}/${name}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-200 text-zinc-200 text-[11px] font-semibold transition-colors"
                      >
                        <span>View Issues</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Connect GitHub to Track Hacktoberfest"
        description="Sign in to track your pull requests, monitor merge speed, and earn verified completion cards."
        source="hacktoberfest"
      />
    </div>
  );
}
