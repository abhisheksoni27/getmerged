import React from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";

interface Step {
  num: number;
  title: string;
  desc: string;
}

interface FirstMergeStepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
  trackedPRState: string | null;
  onStepClick: (step: 1 | 2 | 3 | 4) => void;
}

export function FirstMergeStepIndicator({
  currentStep,
  trackedPRState,
  onStepClick,
}: FirstMergeStepIndicatorProps) {
  const stepsConfig: Step[] = [
    { num: 1, title: "Repo Match", desc: "Pick a high-probability repo" },
    { num: 2, title: "Issue Claim", desc: "Select a Good First Issue" },
    { num: 3, title: "Preflight Check", desc: "Test PR readiness & forecast" },
    { num: 4, title: "PR Merged", desc: "Track review to merge" },
  ];

  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stepsConfig.map((s) => {
        const isDone = currentStep > s.num || (s.num === 4 && trackedPRState === "merged");
        const isCurrent = currentStep === s.num && !(s.num === 4 && trackedPRState === "merged");

        return (
          <div
            key={s.num}
            onClick={() => onStepClick(s.num as 1 | 2 | 3 | 4)}
            className={`cursor-pointer rounded-xl border p-3 transition-all ${
              isCurrent
                ? "border-emerald-500 glass-panel shadow-sm ring-1 ring-emerald-500"
                : isDone
                ? "border-emerald-200 bg-emerald-950/70 border-emerald-800/80/70 text-emerald-300"
                : "border-white/[0.1] glass-card/60 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-center gap-2">
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : isCurrent ? (
                <CircleDashed className="h-4 w-4 shrink-0 animate-spin text-emerald-600" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-300">
                  {s.num}
                </span>
              )}
              <span className="text-xs font-bold text-white">{s.title}</span>
            </div>
            <p className="mt-1 line-clamp-1 text-[11px] text-zinc-300">{s.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
