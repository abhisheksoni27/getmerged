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
    <div className="rounded-2xl glass-card border border-white/[0.08] p-5">
      <div className="font-space text-sm font-bold text-white mb-4">
        {repo.full_name}
      </div>
      <div className="space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
          <span className="text-zinc-400 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-cyan-400" /> Peak Review Hour (UTC)</span>
          <span className="text-white font-bold">
            {peakLabel}
          </span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
          <span className="text-zinc-400 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-purple-400" /> Best Days to Submit</span>
          <span className="text-emerald-300 font-bold">
            {dayWindow}
          </span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
          <span className="text-zinc-400 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-amber-400" /> Active Reviewers</span>
          <span className="text-white font-bold">
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
    <section aria-label="Optimal Submission Timing & Maintainer Activity" className="mb-10 rounded-3xl border border-white/[0.08] glass-panel p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold mb-1">
            <Clock className="h-4 w-4" /> Maintainer Availability & Review Windows
          </div>
          <h2 className="font-space text-xl sm:text-2xl font-bold text-white">
            When Do Reviewers Actually Respond?
          </h2>
        </div>
        <span className="text-xs font-mono text-zinc-400">UTC Operating Schedule</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TimingCard repo={repoA} timing={optimalTimeA} />
        <TimingCard repo={repoB} timing={optimalTimeB} />
      </div>
    </section>
  );
}
