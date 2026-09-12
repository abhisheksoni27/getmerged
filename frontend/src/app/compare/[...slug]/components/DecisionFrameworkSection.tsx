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
    <section aria-label="Contribution Guidance and Decision Framework" className="mb-12 rounded-3xl border border-white/[0.08] glass-panel p-6 sm:p-8">
      <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold mb-2">
        <Sparkles className="h-4 w-4" /> Actionable Decision Framework
      </div>
      <h2 className="font-space text-xl sm:text-2xl font-bold text-white mb-2">
        Where Should You Contribute?
      </h2>
      <p className="text-xs sm:text-sm text-zinc-400 font-sans mb-6 max-w-2xl">
        Choose your contribution target based on your specific developer goals rather than vanity star counts.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scenario 1: Quickest First PR Merge */}
        <div className="p-5 rounded-2xl glass-card border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Highest Merge Probability
            </div>
            <h3 className="font-space text-base font-bold text-white mb-2">
              {mergeWinnerName}
            </h3>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
              {`${mergeWinnerName} accepts ${formatPercent(winnerMergeRate)} of external PRs versus ${formatPercent(loserMergeRate)} for ${mergeLoserName}. Lower rejection friction.`}
            </p>
          </div>
          <div className="pt-3 border-t border-white/[0.06] text-xs font-mono text-emerald-400">
            Pick for confident shipping
          </div>
        </div>

        {/* Scenario 2: Fastest Feedback Loop */}
        <div className="p-5 rounded-2xl glass-card border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-cyan-400" /> Fastest Review Turnaround
            </div>
            <h3 className="font-space text-base font-bold text-white mb-2">
              {latencyWinnerName}
            </h3>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
              {`${latencyWinnerName} averages ~${formatHours(winnerLatency)} to initial review versus ~${formatHours(loserLatency)} for ${latencyLoserName}. Shorter waiting periods.`}
            </p>
          </div>
          <div className="pt-3 border-t border-white/[0.06] text-xs font-mono text-cyan-400">
            Pick for rapid iteration
          </div>
        </div>

        {/* Scenario 3: Community Resilience & Bus Factor */}
        <div className="p-5 rounded-2xl glass-card border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-purple-400" /> Reviewer Breadth & Health
            </div>
            <h3 className="font-space text-base font-bold text-white mb-2">
              {busWinnerName}
            </h3>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
              {`${busWinnerName} boasts ${winnerBus} active maintainers (vs ${loserBus}), meaning your PR does not depend on a single overwhelmed person.`}
            </p>
          </div>
          <div className="pt-3 border-t border-white/[0.06] text-xs font-mono text-purple-400">
            Pick for lower burnout risk
          </div>
        </div>
      </div>
    </section>
  );
}
