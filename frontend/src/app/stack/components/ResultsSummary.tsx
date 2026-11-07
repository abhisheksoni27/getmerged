"use client";

import { Bell, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { StackAnalysisResult, healthGradeStyle } from "./stackTypes";

export function ResultsSummary({
  result,
  alertSaved,
}: {
  result: StackAnalysisResult;
  alertSaved: boolean;
}) {
  return (
    <div className="glass-panel border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] mb-1">
            <span>Manifest: {result.manifest_type}</span>
            {result.repo_full_name && (
              <>
                <span>•</span>
                <span className="text-emerald-400 font-bold">
                  {result.repo_full_name}
                </span>
              </>
            )}
          </div>
          <h2 className="text-2xl font-bold font-space text-[var(--text-primary)] flex items-center gap-3">
            <span>Stack Health Grade:</span>
            <span
              className={`inline-block px-3 py-0.5 rounded-lg font-mono text-xl font-black ${healthGradeStyle(result.summary.overall_health_grade)}`}
            >
              Tier {result.summary.overall_health_grade}
            </span>
          </h2>
        </div>

        {/* Alert Status */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <Bell className="h-3.5 w-3.5 text-emerald-400" />
            <span>{alertSaved ? "Stack Saved & Monitored for Weekly Alerts" : "Stack Analysis Ready"}</span>
          </span>
        </div>
      </div>

      {/* Metrics Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <div className="text-[var(--text-secondary)] text-xs font-mono mb-1">Dependencies</div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            {result.summary.total_dependencies}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {result.summary.indexed_dependencies} indexed in C-Rank
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
          <div className="text-emerald-400 text-xs font-mono mb-1 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Healthy Repos
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {result.summary.healthy_count}
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">Tier S & A (Fast Merge)</div>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20">
          <div className="text-amber-400 text-xs font-mono mb-1 flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" /> Fragile / At Risk
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {result.summary.at_risk_count}
          </div>
          <div className="text-[11px] text-amber-500/80 mt-1">Bus Factor = 1 or Tier D</div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-900/30 border border-emerald-400/30">
          <div className="text-emerald-300 text-xs font-mono mb-1 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Open Good First Issues
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            {result.summary.total_good_first_issues}
          </div>
          <div className="text-[11px] text-emerald-300/80 mt-1">Beginner Issues in Your Stack</div>
        </div>
      </div>
    </div>
  );
}
