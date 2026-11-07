import React from "react";
import { Repo } from "@/types/opendoor";
import { Clock, Users, Calendar } from "lucide-react";
import { OptimalTimeData } from "../lib/compareInsights";

interface TimingCardProps {
  repo: Repo;
  timing: OptimalTimeData | null;
}

function TimingCard({ repo, timing }: TimingCardProps) {
  const peakHour = timing?.optimal_time?.peak_hour_utc;
  const hasPeakHour = peakHour !== undefined;
  const peakLabel = hasPeakHour ? `${peakHour}:00 UTC` : "Variable";
  const dayWindow = timing?.optimal_time?.recommended_day_window || "Mon - Thu";
  const reviewerCount = timing?.optimal_time?.active_maintainer_count ?? repo.bus_factor ?? 1;

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-sm">
      <div className="font-space text-base font-bold text-[var(--text-primary)] mb-4">
        {repo.full_name}
      </div>
      <div className="space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-sky-600" /> Peak Review Hour (UTC)</span>
          <span className="text-[var(--text-primary)] font-bold">
            {peakLabel}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-purple-600" /> Best Days to Submit</span>
          <span className="text-[#0D9668] font-bold">
            {dayWindow}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-amber-600" /> Active Reviewers</span>
          <span className="text-[var(--text-primary)] font-bold">
            {reviewerCount} Maintainers
          </span>
        </div>
      </div>
    </div>
  );
}

interface OptimalTimeSectionProps {
  repoA: Repo;
  repoB: Repo;
  optimalTimeA: OptimalTimeData | null;
  optimalTimeB: OptimalTimeData | null;
}

export function OptimalTimeSection({ repoA, repoB, optimalTimeA, optimalTimeB }: OptimalTimeSectionProps) {
  return (
    <section aria-label="Optimal Submission Timing & Maintainer Activity" className="mb-10 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#2D8ABF] font-bold mb-1">
            <Clock className="h-4 w-4" /> Maintainer Availability & Review Windows
          </div>
          <h2 className="font-space text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            When Do Reviewers Actually Respond?
          </h2>
        </div>
        <span className="text-xs font-mono text-[var(--text-muted)]">UTC Operating Schedule</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TimingCard repo={repoA} timing={optimalTimeA} />
        <TimingCard repo={repoB} timing={optimalTimeB} />
      </div>
    </section>
  );
}
