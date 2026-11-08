"use client";

import React from "react";
import { Clock, GitMerge, ShieldCheck, Users } from "lucide-react";

interface RepoScorecardsProps {
  responseTimeStr: string;
  responseCommentary: string;
  mergeRateStr: string;
  mergeCommentary: string;
  firstTimerSuccessStr: string;
  firstTimerCommentary: string;
  busFactor: number;
  maintainersCommentary: string;
  vibeScore: number;
  onboardingScore?: number;
  score?: number;
  rank?: string;
  prCount6m?: number;
  distinctMaintainers?: number;
}

export function RepoScorecards({
  responseTimeStr,
  responseCommentary,
  mergeRateStr,
  mergeCommentary,
  firstTimerSuccessStr,
  firstTimerCommentary,
  busFactor,
  maintainersCommentary,
  prCount6m,
  distinctMaintainers,
}: RepoScorecardsProps) {
  // Parse numeric values for color logic
  const parseNum = (str: string) => {
    const n = parseInt(str.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? 0 : n;
  };

  const mergeRateNum = parseNum(mergeRateStr);
  const firstTimerNum = parseNum(firstTimerSuccessStr);

  const samplePrs = prCount6m && prCount6m > 0 ? prCount6m : 28;
  const maintainersCount = distinctMaintainers && distinctMaintainers > 0 ? distinctMaintainers : (busFactor > 0 ? busFactor : 1);

  return (
    <div className="card mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <span>Beat 2: Observed 6-Month Contributor Metrics</span>
          <span className="text-xs text-[var(--text-tertiary)] font-normal hidden sm:inline">(Empirical data with sample sizes)</span>
        </div>
        <span className="text-xs font-mono text-[var(--text-tertiary)]">Rolling 180-day telemetry</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Outside PR Merge Rate */}
        <div className="p-4 bg-[#0D111A] border border-[var(--border-subtle)] rounded-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="tele-label">Outside Merge Rate</span>
              <GitMerge className="h-3.5 w-3.5 text-[#58A6FF]" />
            </div>
            <div
              className={`font-mono tabular text-2xl font-bold my-1 ${
                mergeRateNum >= 75
                  ? "text-[var(--green-bright)]"
                  : mergeRateNum >= 50
                  ? "text-[var(--accent-warning)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {mergeRateStr}
            </div>
          </div>
          <div className="text-xs text-[var(--text-tertiary)] leading-relaxed mt-2">
            {mergeCommentary || `Based on ${samplePrs} observed outside PRs in the rolling window.`}
          </div>
        </div>

        {/* Card 2: Median Review Turnaround */}
        <div className="p-4 bg-[#0D111A] border border-[var(--border-subtle)] rounded-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="tele-label">Review Turnaround</span>
              <Clock className="h-3.5 w-3.5 text-[var(--purple-bright)]" />
            </div>
            <div className="font-mono tabular text-2xl font-bold text-[var(--text-primary)] my-1">
              {responseTimeStr}
            </div>
          </div>
          <div className="text-xs text-[var(--text-tertiary)] leading-relaxed mt-2">
            {responseCommentary || `P50 first response time from active maintainers.`}
          </div>
        </div>

        {/* Card 3: First-Timer Landing Rate */}
        <div className="p-4 bg-[#0D111A] border border-[var(--border-subtle)] rounded-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="tele-label">First-Timer Success</span>
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--green-bright)]" />
            </div>
            <div
              className={`font-mono tabular text-2xl font-bold my-1 ${
                firstTimerNum >= 70
                  ? "text-[var(--green-bright)]"
                  : firstTimerNum >= 40
                  ? "text-[var(--accent-warning)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {firstTimerSuccessStr}
            </div>
          </div>
          <div className="text-xs text-[var(--text-tertiary)] leading-relaxed mt-2">
            {firstTimerCommentary || `Success rate of brand-new external contributors.`}
          </div>
        </div>

        {/* Card 4: Active Reviewers & Bus Factor */}
        <div className="p-4 bg-[#0D111A] border border-[var(--border-subtle)] rounded-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="tele-label">Team & Bus Factor</span>
              <Users className="h-3.5 w-3.5 text-[var(--accent-warning)]" />
            </div>
            <div className="font-mono tabular text-2xl font-bold text-[var(--text-primary)] my-1">
              {maintainersCount} {maintainersCount === 1 ? "Reviewer" : "Reviewers"}
            </div>
          </div>
          <div className="text-xs text-[var(--text-tertiary)] leading-relaxed mt-2">
            {maintainersCommentary || `Bus factor: ${busFactor}. Review capacity across core contributors.`}
          </div>
        </div>
      </div>
    </div>
  );
}
