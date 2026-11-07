import React from "react";
import { Compass, RefreshCw, AlertTriangle, ExternalLink, Check } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { FirstMergeTrackState } from "@/hooks/useFirstMergePersistence";
import { GoodFirstIssueItem } from "@/hooks/useFirstMergeMatches";
import { FitRadarData } from "@/hooks/useFitRadar";
import { IssueClaimResponse } from "@/hooks/useIssueClaims";
import { StepShell } from "./FirstMergeStepShell";

interface FirstMergeClaimStepProps {
  trackState: FirstMergeTrackState;
  fitRadar: FitRadarData | null;
  issues: GoodFirstIssueItem[];
  loadingIssues: boolean;
  issuesError: string | null;
  serverClaimedKeys: Set<string>;
  claimState: {
    posting: boolean;
    error: string | null;
    result: IssueClaimResponse | null;
  };
  needsGitHubAuth: boolean;
  migrationStatus: string | null;
  onRestartStep: (step: 1 | 2 | 3 | 4) => void;
  onManualAdvance: (step: 1 | 2 | 3 | 4) => void;
  onClaimIssue: (issue: GoodFirstIssueItem) => void;
}

export function FirstMergeClaimStep({
  trackState,
  fitRadar,
  issues,
  loadingIssues,
  issuesError,
  serverClaimedKeys,
  claimState,
  needsGitHubAuth,
  migrationStatus,
  onRestartStep,
  onManualAdvance,
  onClaimIssue,
}: FirstMergeClaimStepProps) {
  const fullName = trackState.selectedRepo?.fullName || "";

  return (
    <StepShell
      icon={<Compass className="h-4 w-4 text-emerald-600" />}
      title="Step 2: Claim a Good First Issue"
      description="Pick an open starter issue to work on, then proceed to Preflight evaluation."
      badge={
        trackState.selectedRepo && (
          <span className="rounded-full glass-card px-2 py-0.5 text-xs font-mono font-semibold text-[var(--text-secondary)]">
            {trackState.selectedRepo.fullName}
          </span>
        )
      }
      action={
        <button
          onClick={() => onRestartStep(1)}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-secondary)] underline cursor-pointer"
        >
          Change Repo
        </button>
      }
    >

      {fitRadar && (
        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-950/70 border-emerald-800/80/40 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-secondary)]">Fit Radar:</span>
            <span className="text-[var(--text-secondary)]">
              Onboarding: {fitRadar.onboarding_quality}% · First-timer: {fitRadar.first_timer_receptivity}% · Merge prob: {fitRadar.merge_probability}%
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-300 capitalize font-medium">
            {fitRadar.contributor_level || "beginner"} fit
          </span>
        </div>
      )}

      {migrationStatus && (
        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-950/40 border border-indigo-500/20/50 p-3 text-xs text-indigo-300">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            {migrationStatus}
          </div>
          {needsGitHubAuth && (
            <a
              href={`${API_BASE_URL}/api/v1/auth/github`}
              className="mt-2 inline-flex items-center gap-1 rounded-md glass-card px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Sign in with GitHub to finish syncing
            </a>
          )}
        </div>
      )}

      {loadingIssues ? (
        <div className="mt-4 py-8 text-center text-xs text-[var(--text-secondary)] animate-pulse">
          Fetching open Good First Issues for {fullName}...
        </div>
      ) : issuesError ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-950/70 border-amber-800/80 p-4 text-xs text-amber-300">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            {issuesError}
          </div>
          <p className="mt-1 text-amber-300">
            You can restart this step to choose another repo, or manually proceed if you already picked an issue.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => onRestartStep(1)}
              className="rounded-md bg-amber-700 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800"
            >
              Restart Step: Pick Another Repo
            </button>
            <button
              onClick={() => onManualAdvance(3)}
              className="rounded-md border border-amber-300 glass-panel px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-950/70 border-amber-800/80"
            >
              Proceed to Preflight Check →
            </button>
          </div>
        </div>
      ) : issues.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-secondary)]">
          No good-first-issues returned.
          <div className="mt-2 flex justify-center gap-2">
            <button
              onClick={() => onRestartStep(1)}
              className="rounded-md glass-card px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Choose Another Repo
            </button>
            <button
              onClick={() => onManualAdvance(3)}
              className="rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:glass-card"
            >
              Skip to Preflight →
            </button>
          </div>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {issues.map((issue) => {
              const issueNumber = Number(issue.number ?? issue.id);
              const claimedKey = `${fullName}#${issueNumber}`;
              const serverClaimed = serverClaimedKeys.has(claimedKey);
              const thisResult =
                claimState.result && claimState.result.claim?.repo_full_name === fullName && claimState.result.claim?.issue_number === issueNumber
                  ? claimState.result
                  : null;
              const isPostingThis =
                claimState.posting && !serverClaimed && !thisResult;
              return (
                <li
                  key={issue.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] glass-card/50 p-3 hover:glass-panel hover:border-emerald-400 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={issue.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate block text-xs font-semibold text-white hover:text-emerald-400"
                    >
                      {issue.title} <ExternalLink className="inline h-3 w-3 text-[var(--text-secondary)]" />
                    </a>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      #{issueNumber}
                    </span>
                    {serverClaimed && (
                      <span className="ml-2 rounded bg-emerald-950/80 border-emerald-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                        Claimed (synced)
                      </span>
                    )}
                  </div>

                  {serverClaimed || thisResult ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/80 border-emerald-800/80 px-3 py-1.5 text-xs font-semibold text-emerald-300 shrink-0">
                      <Check className="h-3 w-3" /> Claimed
                    </span>
                  ) : (
                    <button
                      onClick={() => onClaimIssue(issue)}
                      disabled={isPostingThis}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shrink-0 cursor-pointer disabled:opacity-60"
                    >
                      {isPostingThis ? "Posting..." : "Claim Issue & Run Preflight →"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {needsGitHubAuth && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-950/70 border-amber-800/80 p-3 text-xs text-amber-300">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                Sign in with GitHub to post your claim comment.
              </div>
              <p className="mt-1 text-amber-300">
                One-click claiming posts a comment on the issue using your GitHub account.
              </p>
              <a
                href={`${API_BASE_URL}/api/v1/auth/github`}
                className="mt-2 inline-flex items-center gap-1 rounded-md glass-card px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Sign in with GitHub
              </a>
            </div>
          )}
          {!needsGitHubAuth && claimState.error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {claimState.error}
            </div>
          )}
          {!needsGitHubAuth && claimState.result && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-950/70 border-emerald-800/80 p-3 text-xs text-emerald-300">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text-secondary)]">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                {claimState.result.message}
              </div>
              {claimState.result.claim?.attribution_url && (
                <a
                  href={claimState.result.claim.attribution_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 underline hover:text-emerald-400"
                >
                  View repository scorecard <ExternalLink className="inline h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </>
      )}
    </StepShell>
  );
}
