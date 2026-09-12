import React from "react";
import { CheckCircle2 } from "lucide-react";
import { FirstMergeTrackState } from "@/hooks/useFirstMergePersistence";
import { StepShell } from "./FirstMergeStepShell";

interface FirstMergePreflightStepProps {
  trackState: FirstMergeTrackState;
  onRestartStep: (step: 1 | 2 | 3 | 4) => void;
  onManualAdvance: (step: 1 | 2 | 3 | 4) => void;
}

export function FirstMergePreflightStep({
  trackState,
  onRestartStep,
  onManualAdvance,
}: FirstMergePreflightStepProps) {
  return (
    <StepShell
      icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
      title="Step 3: Run Preflight Check"
      description="Evaluate PR quality before submitting to avoid common reviewer rejections."
      action={
        <button
          onClick={() => onRestartStep(2)}
          className="text-xs text-zinc-300 hover:text-zinc-300 underline cursor-pointer"
        >
          Back to Issues
        </button>
      }
    >

      <div className="mt-3 rounded-lg border border-white/[0.1] glass-card p-3 text-xs text-zinc-300 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold">Target:</span>{" "}
          <span className="font-mono text-white font-bold">
            {trackState.selectedRepo?.fullName || "Selected Repository"}
          </span>
          {trackState.claimedIssue && (
            <span className="ml-2 text-zinc-300">
              · Issue:{" "}
              <a
                href={trackState.claimedIssue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-emerald-400"
              >
                {trackState.claimedIssue.title}
              </a>
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="rounded-xl border border-white/[0.1] glass-card p-4">
          <h4 className="text-xs font-bold text-white">Submitted your PR?</h4>
          <p className="mt-1 text-[11px] text-zinc-300 leading-relaxed">
            Once your PR is created on GitHub, advance to monitor review benchmarks and merge tracking.
          </p>
          <div className="mt-3">
            <button
              onClick={() => onManualAdvance(4)}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
            >
              Track PR to Merge →
            </button>
          </div>
        </div>
      </div>
    </StepShell>
  );
}
