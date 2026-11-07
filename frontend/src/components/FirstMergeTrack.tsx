"use client";

import React from "react";
import {
  FirstMergeStepIndicator,
  FirstMergeDiscoveryStep,
  FirstMergeClaimStep,
  FirstMergePreflightStep,
  FirstMergeTrackedPRStep,
} from "@/components/first-merge";
import {
  useFirstMergeTrack,
  FirstMergeTrackMachine,
  FirstMergeStep,
  TrackedPRInput,
} from "@/hooks/useFirstMergeTrack";

interface Props {
  trackedPRs?: TrackedPRInput[];
}

const STEP_NUMBERS: FirstMergeStep[] = [1, 2, 3, 4];

function renderStepContent(
  step: FirstMergeStep,
  t: FirstMergeTrackMachine
): React.ReactNode {
  switch (step) {
    case 1:
      return (
        <FirstMergeDiscoveryStep
          matches={t.matches}
          loadingMatches={t.loadingMatches}
          onSelectRepo={t.handleSelectRepo}
        />
      );
    case 2:
      return (
        <FirstMergeClaimStep
          trackState={t.trackState}
          fitRadar={t.fitRadar}
          issues={t.issues}
          loadingIssues={t.loadingIssues}
          issuesError={t.issuesError}
          serverClaimedKeys={t.issueClaims.serverClaimedKeys}
          claimState={t.issueClaims.claimState}
          needsGitHubAuth={t.issueClaims.needsGitHubAuth}
          migrationStatus={t.issueClaims.migrationStatus}
          onRestartStep={t.handleRestartStep}
          onManualAdvance={t.handleManualAdvance}
          onClaimIssue={t.handleClaimIssue}
        />
      );
    case 3:
      return (
        <FirstMergePreflightStep
          trackState={t.trackState}
          onRestartStep={t.handleRestartStep}
          onManualAdvance={t.handleManualAdvance}
        />
      );
    case 4:
      return (
        <FirstMergeTrackedPRStep
          trackState={t.trackState}
          trackedStatus={t.trackedStatus}
          importUrl={t.importUrl}
          prUrl={t.prUrl}
          trackLoading={t.trackLoading}
          trackError={t.trackError}
          trackNeedsAuth={t.trackNeedsAuth}
          upgradeRequired={t.upgradeRequired}
          onRestartStep={t.handleRestartStep}
          onTrackPR={t.handleTrackPR}
          onPrUrlChange={t.setPrUrl}
          onImportUrl={t.importTrackedUrl}
          onDismissImport={t.dismissImport}
          onCopyShareLink={t.copyShareLink}
        />
      );
    default:
      return null;
  }
}

export function FirstMergeTrack({ trackedPRs = [] }: Props) {
  const track = useFirstMergeTrack(trackedPRs);

  if (!track.mounted) return null;

  const currentStep = track.trackState.step;

  return (
    <section
      data-testid="first-merge-track"
      className="mb-8 rounded-2xl border-2 border-emerald-500/30 glass-panel p-5 sm:p-6 shadow-sm"
      aria-label="First-Merge Track"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
              ★
            </span>
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">First-Merge Track</h2>
            <span className="rounded-full bg-emerald-950/80 border-emerald-800/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              Guided Journey
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            A step-by-step roadmap from repo discovery to your first merged pull request.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <span>Jump to:</span>
          {STEP_NUMBERS.map((s) => (
            <button
              key={s}
              onClick={() => track.handleManualAdvance(s)}
              className={`h-6 w-6 rounded-md text-xs font-bold transition-colors ${
                currentStep === s
                  ? "glass-card text-[var(--text-primary)]"
                  : "glass-card text-[var(--text-secondary)] hover:bg-zinc-200"
              }`}
              title={`Step ${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <FirstMergeStepIndicator
        currentStep={currentStep}
        trackedPRState={track.trackState.trackedPR?.state || null}
        onStepClick={track.handleManualAdvance}
      />

      <div className="mt-5 rounded-xl border border-[var(--border-subtle)] glass-panel p-4 sm:p-5 shadow-xs">
        {renderStepContent(currentStep, track)}
      </div>
    </section>
  );
}
