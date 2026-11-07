import React from "react";
import Link from "next/link";
import { RefreshCw, AlertTriangle, ExternalLink, CheckCircle2, Sparkles } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { FirstMergeTrackState } from "@/hooks/useFirstMergePersistence";
import { TrackedStatusItem } from "@/hooks/useFirstMergeTrack";
import { FirstMergeTrackCard } from "./FirstMergeTrackCard";
import { StepShell } from "./FirstMergeStepShell";

interface FirstMergeTrackedPRStepProps {
  trackState: FirstMergeTrackState;
  trackedStatus: TrackedStatusItem[];
  importUrl: string | null;
  prUrl: string;
  trackLoading: boolean;
  trackError: string | null;
  trackNeedsAuth: boolean;
  upgradeRequired: boolean;
  onRestartStep: (step: 1 | 2 | 3 | 4) => void;
  onTrackPR: () => void;
  onPrUrlChange: (url: string) => void;
  onImportUrl: (url: string) => void;
  onDismissImport: () => void;
  onCopyShareLink: (url: string) => void;
}

export function FirstMergeTrackedPRStep({
  trackState,
  trackedStatus,
  importUrl,
  prUrl,
  trackLoading,
  trackError,
  trackNeedsAuth,
  upgradeRequired,
  onRestartStep,
  onTrackPR,
  onPrUrlChange,
  onImportUrl,
  onDismissImport,
  onCopyShareLink,
}: FirstMergeTrackedPRStepProps) {
  const isTerminalPRClosed =
    trackState.trackedPR !== null &&
    trackState.trackedPR.state === "closed";

  return (
    <StepShell
      icon={<RefreshCw className="h-4 w-4 text-emerald-600" />}
      title="Step 4: PR Merge Journey"
      description="Tracking live review benchmarks, reviewer activity, and merge status."
      action={
        <button
          onClick={() => onRestartStep(1)}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-secondary)] underline cursor-pointer"
        >
          Start New Track
        </button>
      }
    >

      <div className="mt-4 rounded-xl border border-[var(--border-subtle)] glass-card/60 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <h4 className="text-sm font-bold text-[var(--text-primary)]">Track a Pull Request</h4>
          <span className="rounded-full glass-card px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
            Live status every 60s
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Paste a GitHub PR URL to monitor review &amp; merge status. On merge we mint a verifiable
          &ldquo;Merged via OpenDoor&rdquo; share card.
        </p>

        {importUrl && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-950/40 border border-indigo-500/20/50 p-3 text-xs text-indigo-300">
            <span>Found a PR you were tracking locally: {importUrl}</span>
            <button
              onClick={() => { onImportUrl(importUrl); }}
              className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Import &amp; Track
            </button>
            <button
              onClick={() => onDismissImport()}
              className="rounded-md border border-indigo-300 glass-panel px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-950/40 border border-indigo-500/20"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={prUrl}
            onChange={(e) => onPrUrlChange(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            className="w-full flex-1 rounded-md border border-[var(--border-subtle)] glass-panel px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
          />
          <button
            onClick={onTrackPR}
            disabled={trackLoading}
            className="shrink-0 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {trackLoading ? "Tracking..." : "Track PR"}
          </button>
        </div>

        {trackError && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{trackError}</div>
        )}

        {trackNeedsAuth && (
          <a
            href={`${API_BASE_URL}/api/v1/auth/github`}
            className="mt-2 inline-flex items-center gap-1 rounded-md glass-card px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            Connect GitHub to track
          </a>
        )}
        {upgradeRequired && (
          <Link prefetch={false}
            href="/pricing"
            className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Upgrade for unlimited tracked PRs
          </Link>
        )}

        {trackedStatus.length > 0 && (
          <ul className="mt-3 space-y-2">
            {trackedStatus.map((p) => (
              <FirstMergeTrackCard
                key={p.pr_id}
                item={p}
                onCopyShareLink={onCopyShareLink}
              />
            ))}
          </ul>
        )}
      </div>

      {isTerminalPRClosed ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <div className="flex items-center gap-1.5 font-bold text-red-900">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            PR was closed without merging
          </div>
          <p className="mt-1 text-red-700 leading-relaxed">
            Don&apos;t worry - open source contributions often take multiple tries. You can pick another issue or repo and try again with Preflight checks.
          </p>
          <div className="mt-3">
            <button
              onClick={() => onRestartStep(2)}
              className="inline-flex items-center gap-1 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 cursor-pointer"
            >
              Restart Step: Pick Another Issue
            </button>
          </div>
        </div>
      ) : trackState.trackedPR?.state === "merged" ? (
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-xs text-violet-900">
          <div className="flex items-center gap-1.5 font-bold text-violet-950 text-sm">
            <CheckCircle2 className="h-4 w-4 text-violet-600" />
            First Merge Accomplished!
          </div>
          <p className="mt-1 text-violet-800 leading-relaxed">
            Your pull request in <strong>{trackState.trackedPR.title}</strong> has been successfully merged!
          </p>
          <div className="mt-3 flex items-center gap-2">
            <a
              href={trackState.trackedPR.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800"
            >
              View Merged PR <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={() => onRestartStep(1)}
              className="rounded-md border border-violet-300 glass-panel px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-50"
            >
              Start Another Contribution
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-950/70 border-emerald-800/80/40 p-4 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">PR Tracking Active</div>
            <span className="rounded-full bg-emerald-950/80 border-emerald-800/80 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
              Awaiting Merge
            </span>
          </div>
          <p className="mt-1 text-[var(--text-secondary)] leading-relaxed">
            Your pull request is being monitored via background sync. Live review metrics and median merge times are visible in the tracker below.
          </p>
        </div>
      )}
    </StepShell>
  );
}
