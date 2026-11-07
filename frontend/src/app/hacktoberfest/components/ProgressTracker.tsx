"use client";

import Link from "next/link";
import {
  GitPullRequest,
  RefreshCw,
  Trophy,
  Share2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { ProgressResponse } from "./hacktoberfestTypes";
import { SignupCTA } from "./SignupCTA";

interface ProgressTrackerProps {
  progress: ProgressResponse | null;
  loading: boolean;
  isAuthenticated: boolean | null;
  isNudging: boolean;
  copiedCard: boolean;
  mergedCount: number;
  target: number;
  progressPercent: number;
  onCheckMerges: () => void;
  onSignIn: () => void;
  onCopyShareLink: (shareUrl: string) => void;
}

export function ProgressTracker({
  progress,
  loading,
  isAuthenticated,
  isNudging,
  copiedCard,
  mergedCount,
  target,
  progressPercent,
  onCheckMerges,
  onSignIn,
  onCopyShareLink,
}: ProgressTrackerProps) {
  return (
    <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-[var(--border-subtle)] shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-space">
              Live Merge Progress Tracker
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Validates pull requests to public repositories merged between Oct 1–31 UTC (no spam/invalid labels).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onCheckMerges}
              disabled={isNudging}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)] hover:glass-card disabled:opacity-50 transition-all cursor-pointer shadow-2xs"
              title="Force refresh against GitHub search API (throttled to 1/min)"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isNudging ? "animate-spin text-orange-600" : ""}`} />
              <span>{isNudging ? "Checking..." : "Check Merges"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl glass-card text-[var(--text-primary)] text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
            >
              <span>Connect GitHub to Track</span>
            </button>
          )}
        </div>
      </div>

      {isAuthenticated === false && !loading && <SignupCTA onSignIn={onSignIn} />}

      {isAuthenticated && (
        <div className="mt-6 space-y-6">
          {/* Progress Bar and Big Counter */}
          <div className="glass-card rounded-2xl p-6 border border-[var(--border-subtle)]/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-bold font-space text-[var(--text-primary)]">
                    {mergedCount}
                  </span>
                  <span className="text-lg font-bold text-[var(--text-secondary)] font-space">
                    of {target} PRs Merged
                  </span>
                  {progress?.total_qualifying && progress.total_qualifying > 4 ? (
                    <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/80 border-emerald-800/80 px-2 py-0.5 rounded-md ml-2">
                      +{progress.total_qualifying - 4} extra qualifying PRs
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] font-mono text-[var(--text-secondary)] mt-1 flex items-center gap-2">
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
                  <Link prefetch={false}
                    href={progress.card.share_url}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <Trophy className="h-3.5 w-3.5 text-amber-300" />
                    View Completion Card
                  </Link>
                  <button
                    type="button"
                    onClick={() => onCopyShareLink(progress.card!.share_url)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)] hover:glass-card transition-colors shadow-2xs cursor-pointer"
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
                        : "glass-panel border-[var(--border-subtle)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {isDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-[var(--border-subtle)] flex items-center justify-center text-[9px]">
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
              <h4 className="text-xs font-mono uppercase font-semibold text-[var(--text-secondary)] mb-3 tracking-wider">
                Verified Qualifying Merges
              </h4>
              <div className="divide-y divide-zinc-100 rounded-2xl border border-[var(--border-subtle)] overflow-hidden glass-panel">
                {progress.merges.map((merge) => (
                  <div
                    key={merge.pr_id}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:glass-card/70 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-space text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                          {merge.title || merge.pr_id}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[var(--text-secondary)] mt-1 flex items-center gap-2">
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
                        className="inline-flex items-center gap-1 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
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
  );
}
