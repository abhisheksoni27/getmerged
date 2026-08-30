"use client";

import React, { useEffect, useState } from "react";
import { Zap, TrendingUp, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface PRSizeBucket {
  label: string;
  line_range: string;
  median_merge_hours: number;
  merge_rate: number;
  review_likelihood: string;
}

interface PRSizeSweetSpotData {
  sweet_spot_threshold: string;
  speed_multiplier: number;
  actionable_advice: string;
  small_pr: PRSizeBucket;
  medium_pr: PRSizeBucket;
  large_pr: PRSizeBucket;
}

interface PRSizeSweetSpotCardProps {
  repoId: string;
  repoFullName: string;
}

export function PRSizeSweetSpotCard({ repoId, repoFullName }: PRSizeSweetSpotCardProps) {
  const [data, setData] = useState<PRSizeSweetSpotData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchSweetSpot() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(repoId)}/pr-size-sweetspot`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Degrade gracefully
      } finally {
        setLoading(false);
      }
    }
    if (repoId) {
      fetchSweetSpot();
    }
  }, [repoId]);

  if (loading || !data) return null;

  const formatHours = (hours: number) => {
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = (hours / 24).toFixed(1);
    return `${days}d`;
  };

  return (
    <div className="rounded-3xl glass-panel border border-amber-500/20 p-6 sm:p-7 bg-gradient-to-br from-amber-950/10 via-zinc-950/60 to-zinc-900/40 relative overflow-hidden shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold">
            <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            <span>PR Velocity Sweet Spot</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-space text-white">
            Optimal PR Size for {repoFullName}
          </h3>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Sweet Spot: <strong className="text-white font-bold">{data.sweet_spot_threshold}</strong></span>
        </div>
      </div>

      {/* 3 Size Comparison Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Small PR */}
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 relative space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Small ({data.small_pr.line_range})
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              Recommended
            </span>
          </div>
          <div className="space-y-1 pt-1">
            <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-1">
              {formatHours(data.small_pr.median_merge_hours)}
              <span className="text-xs text-zinc-400 font-sans">avg review</span>
            </div>
            <div className="text-xs font-mono text-emerald-300 font-semibold">
              {Math.round(data.small_pr.merge_rate)}% Merge Approval
            </div>
          </div>
        </div>

        {/* Medium PR */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-zinc-300">
              Medium ({data.medium_pr.line_range})
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Normal</span>
          </div>
          <div className="space-y-1 pt-1">
            <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-1">
              {formatHours(data.medium_pr.median_merge_hours)}
              <span className="text-xs text-zinc-400 font-sans">avg review</span>
            </div>
            <div className="text-xs font-mono text-zinc-300 font-semibold">
              {Math.round(data.medium_pr.merge_rate)}% Merge Approval
            </div>
          </div>
        </div>

        {/* Large PR */}
        <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Large ({data.large_pr.line_range})
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">
              Slow
            </span>
          </div>
          <div className="space-y-1 pt-1">
            <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-1">
              {formatHours(data.large_pr.median_merge_hours)}
              <span className="text-xs text-zinc-400 font-sans">avg review</span>
            </div>
            <div className="text-xs font-mono text-red-300 font-semibold">
              {Math.round(data.large_pr.merge_rate)}% Merge Approval
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Advice Banner */}
      <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/[0.08] flex items-start gap-3">
        <TrendingUp className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-300 leading-relaxed font-sans">
          <strong>Maintainer Strategy:</strong> {data.actionable_advice}
        </p>
      </div>
    </div>
  );
}
