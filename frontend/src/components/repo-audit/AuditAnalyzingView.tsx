"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { ANALYSIS_STEPS } from "./constants";

// Animated analyzing view - pure UX, no real backend streaming needed
export function AuditAnalyzingView({
  fullName,
  onComplete,
}: {
  fullName: string;
  onComplete: () => Promise<boolean>;
}) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState<string>(ANALYSIS_STEPS[0].key);
  const [done, setDone] = useState(false);
  const didFetch = useRef(false);

  useEffect(() => {
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    ANALYSIS_STEPS.forEach((step, i) => {
      // Mark previous as done + set this as active
      const startTimer = setTimeout(() => {
        setActiveStep(step.key);
        if (i > 0) {
          setCompletedSteps((prev) => new Set([...prev, ANALYSIS_STEPS[i - 1].key]));
        }
      }, cumulative);
      timers.push(startTimer);
      cumulative += step.durationMs;
    });

    // Mark last step done
    const finalTimer = setTimeout(() => {
      setCompletedSteps(new Set(ANALYSIS_STEPS.map((s) => s.key)));
      setDone(true);
    }, cumulative + 400);
    timers.push(finalTimer);

    // Fetch the actual report after all steps complete
    const fetchTimer = setTimeout(async () => {
      if (!didFetch.current) {
        didFetch.current = true;
        await onComplete();
      }
    }, cumulative + 800);
    timers.push(fetchTimer);

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const totalDone = completedSteps.size;
  const pct = Math.round((totalDone / ANALYSIS_STEPS.length) * 100);

  return (
    <div className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 border border-emerald-500/30 text-emerald-400">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <h2 className="text-base font-bold font-mono text-[var(--text-primary)]">Analyzing {fullName}</h2>
          <p className="text-xs text-[var(--text-secondary)] font-mono">Running 10-dimension maintainer intelligence scan…</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps list */}
      <div className="space-y-2.5 mb-6">
        {ANALYSIS_STEPS.map((step) => {
          const isComplete = completedSteps.has(step.key);
          const isActive = activeStep === step.key && !isComplete;
          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-300 ${
                isActive
                  ? "bg-emerald-950/40 border border-emerald-500/30"
                  : isComplete
                  ? "bg-black/20 border border-white/[0.04]"
                  : "border border-transparent"
              }`}
            >
              <span className="text-base shrink-0">{step.icon}</span>
              <span
                className={`text-xs font-mono flex-1 transition-colors ${
                  isComplete
                    ? "text-[var(--text-secondary)]"
                    : isActive
                    ? "text-white font-bold"
                    : "text-zinc-600"
                }`}
              >
                {step.label}
              </span>
              <span className="shrink-0 text-[11px] font-mono">
                {isComplete ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> done
                  </span>
                ) : isActive ? (
                  <span className="text-emerald-300 flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3 animate-spin" /> running
                  </span>
                ) : (
                  <span className="text-zinc-700">queued</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs font-mono text-[var(--text-tertiary)]">
        {done ? (
          <span className="text-emerald-400 animate-pulse">✓ Analysis complete - loading your report…</span>
        ) : (
          <span>{totalDone} of {ANALYSIS_STEPS.length} dimensions complete · est. {Math.max(0, Math.ceil((ANALYSIS_STEPS.length - totalDone) * 1.0))}s remaining</span>
        )}
      </div>
    </div>
  );
}
