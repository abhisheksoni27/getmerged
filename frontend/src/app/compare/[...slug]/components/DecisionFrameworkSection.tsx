import React from "react";
import { Repo } from "@/types/opendoor";
import { Clock, Users, CheckCircle2, Sparkles } from "lucide-react";
import {
  computeCompareInsights,
  formatHours,
  formatPercent,
} from "../lib/compareInsights";

interface DecisionFrameworkSectionProps {
  repoA: Repo;
  repoB: Repo;
}

export function DecisionFrameworkSection({ repoA, repoB }: DecisionFrameworkSectionProps) {
  const insights = computeCompareInsights(repoA, repoB);
  const { mergeRateA, mergeRateB, latencyA, latencyB, busA, busB } = insights;

  const mergeWinnerName = insights.mergeWinner.full_name;
  const latencyWinnerName = insights.latencyWinner.full_name;
  const busWinnerName = insights.busWinner.full_name;

  const mergeLoserName = mergeWinnerName === repoA.full_name ? repoB.full_name : repoA.full_name;
  const latencyLoserName = latencyWinnerName === repoA.full_name ? repoB.full_name : repoA.full_name;

  const winnerMergeRate = mergeWinnerName === repoA.full_name ? mergeRateA : mergeRateB;
  const loserMergeRate = mergeWinnerName === repoA.full_name ? mergeRateB : mergeRateA;
  const winnerLatency = latencyWinnerName === repoA.full_name ? latencyA : latencyB;
  const loserLatency = latencyWinnerName === repoA.full_name ? latencyB : latencyA;
  const winnerBus = busWinnerName === repoA.full_name ? busA : busB;
  const loserBus = busWinnerName === repoA.full_name ? busB : busA;

  return (
    <section aria-label="Contribution Guidance and Decision Framework" className="mb-12 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-mono text-[#0D9668] font-bold mb-2">
        <Sparkles className="h-4 w-4" /> Actionable Decision Framework
      </div>
      <h2 className="font-space text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">
        Where Should You Contribute?
      </h2>
      <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mb-6 max-w-2xl">
        Choose your contribution target based on your specific developer goals rather than vanity star counts.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scenario 1: Quickest First PR Merge */}
        <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between shadow-xs">
          <div>
            <div className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#0D9668]" /> Highest Merge Probability
            </div>
            <h3 className="font-space text-base font-bold text-[var(--text-primary)] mb-2">
              {mergeWinnerName}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans leading-relaxed mb-4">
              {`${mergeWinnerName} accepts ${formatPercent(winnerMergeRate)} of external PRs versus ${formatPercent(loserMergeRate)} for ${mergeLoserName}. Lower rejection friction.`}
            </p>
          </div>
          <div className="pt-3 border-t border-[var(--border-subtle)] text-xs font-mono font-semibold text-[#0D9668]">
            Pick for confident shipping
          </div>
        </div>

        {/* Scenario 2: Fastest Feedback Loop */}
        <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between shadow-xs">
          <div>
            <div className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#2D8ABF]" /> Fastest Review Turnaround
            </div>
            <h3 className="font-space text-base font-bold text-[var(--text-primary)] mb-2">
              {latencyWinnerName}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans leading-relaxed mb-4">
              {`${latencyWinnerName} averages ~${formatHours(winnerLatency)} to initial review versus ~${formatHours(loserLatency)} for ${latencyLoserName}. Shorter waiting periods.`}
            </p>
          </div>
          <div className="pt-3 border-t border-[var(--border-subtle)] text-xs font-mono font-semibold text-[#2D8ABF]">
            Pick for rapid iteration
          </div>
        </div>

        {/* Scenario 3: Community Resilience & Bus Factor */}
        <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between shadow-xs">
          <div>
            <div className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#8B6BB5]" /> Reviewer Breadth & Health
            </div>
            <h3 className="font-space text-base font-bold text-[var(--text-primary)] mb-2">
              {busWinnerName}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans leading-relaxed mb-4">
              {`${busWinnerName} boasts ${winnerBus} active maintainers (vs ${loserBus}), meaning your PR does not depend on a single overwhelmed person.`}
            </p>
          </div>
          <div className="pt-3 border-t border-[var(--border-subtle)] text-xs font-mono font-semibold text-[#8B6BB5]">
            Pick for lower burnout risk
          </div>
        </div>
      </div>
    </section>
  );
}
