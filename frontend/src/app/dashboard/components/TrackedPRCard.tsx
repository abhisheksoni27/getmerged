"use client";

import React, { useMemo } from "react";
import {
  CircleDashed,
  MessageSquareWarning,
  CheckCircle2,
  Merge,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatVerdict, formatAccuracy } from "@/lib/pr-verdict";
import type { TrackedPR } from "./types";
import { fmtHours } from "./dashboard-utils";
import { DashboardCard } from "./DashboardCard";
import { BenchmarkCard } from "./BenchmarkCard";
import { ForecastCard } from "./ForecastCard";

const STATE_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  open: {
    label: "Open",
    icon: <CircleDashed className="h-3.5 w-3.5" />,
    cls: "glass-card text-zinc-300 border border-white/[0.12]",
  },
  changes_requested: {
    label: "Changes requested",
    icon: <MessageSquareWarning className="h-3.5 w-3.5" />,
    cls: "bg-amber-500/15 border border-amber-500/30 text-amber-300 border border-amber-300",
  },
  approved: {
    label: "Approved",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    cls: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 border border-emerald-300",
  },
  merged: {
    label: "Merged",
    icon: <Merge className="h-3.5 w-3.5" />,
    cls: "bg-violet-100 text-violet-800 border border-violet-300",
  },
  closed: {
    label: "Closed",
    icon: <XCircle className="h-3.5 w-3.5" />,
    cls: "bg-red-100 text-red-700 border border-red-300",
  },
};

interface TrackedPRCardProps {
  pr: TrackedPR;
}

export function TrackedPRCard({ pr }: TrackedPRCardProps) {
  const meta = STATE_META[pr.state] ?? STATE_META.open;
  // Verified verdict (AC1/AC3): same field set as share pages/OG.
  const verdictView = useMemo(() => formatVerdict(pr.outcome ?? null), [pr.outcome]);
  const accuracyView = useMemo(() => formatAccuracy(pr.outcome ?? null), [pr.outcome]);
  const verdictCls = useMemo(
    () =>
      verdictView?.tone === "good"
        ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 border border-emerald-300"
        : verdictView?.tone === "bad"
          ? "bg-red-100 text-red-700 border border-red-300"
          : "glass-card text-zinc-300 border border-white/[0.12]",
    [verdictView]
  );

  return (
    <DashboardCard as="li">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}
            >
              {meta.icon} {meta.label}
            </span>
            {pr.stale && (
              <span
                data-testid="stale-badge"
                className="rounded-full bg-orange-100 text-orange-700 border border-orange-300 px-2 py-0.5 text-[11px] font-semibold"
              >
                stale
              </span>
            )}
            <span className="rounded-full glass-card text-white px-1.5 py-0.5 text-[10px] font-bold">
              {pr.c_rank_tier}
            </span>
          </div>
          <a
            href={pr.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate font-semibold text-sm text-white hover:text-emerald-400"
          >
            {pr.title} <ExternalLink className="inline h-3 w-3 text-zinc-300" />
          </a>
          <div className="text-xs text-zinc-300 mt-0.5">
            {pr.full_name}#{pr.pr_number}
          </div>
        </div>
        <div className="text-right text-xs text-zinc-300 shrink-0 flex items-center gap-1">
          <Clock className="h-3 w-3" /> open {fmtHours(pr.age_hours)}
        </div>
      </div>

      <BenchmarkCard benchmark={pr.benchmark} />

      {/* AC1: verified outcome synced from the PR tracker */}
      {verdictView && (
        <div className="mt-2 flex items-center gap-2 flex-wrap" data-testid="pr-verdict">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold font-mono ${verdictCls}`}
          >
            {verdictView.text}
          </span>
          {accuracyView && (
            <span className="text-[11px] font-mono text-zinc-300">{accuracyView.label}</span>
          )}
        </div>
      )}

      <ForecastCard forecast={pr.forecast} forecastLocked={pr.forecast_locked} />
    </DashboardCard>
  );
}
