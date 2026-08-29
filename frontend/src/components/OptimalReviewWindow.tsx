"use client";

import React, { useEffect, useState } from "react";
import { Clock, Calendar, Sparkles, AlertCircle, CheckCircle2, Globe } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { OptimalTimeResponse, OptimalTimeResult } from "@/types/opendoor";
import { formatUTCHourToLocal, formatUTCRangeToLocal, getUserTimeZone, padZero } from "@/lib/timezone";

interface OptimalReviewWindowProps {
  fullName: string;
}

export function OptimalReviewWindow({ fullName }: OptimalReviewWindowProps) {
  const [data, setData] = useState<OptimalTimeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    let isSubscribed = true;

    async function fetchOptimalTime() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/optimal-time?name=${encodeURIComponent(fullName)}`);
        if (res.ok) {
          const json: OptimalTimeResponse = await res.json();
          if (isSubscribed && json.optimal_time) {
            setData(json.optimal_time);
          }
        }
      } catch (err) {
        console.error("Failed to fetch optimal time data:", err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    fetchOptimalTime();
    return () => {
      isSubscribed = false;
    };
  }, [fullName]);

  if (loading) {
    return (
      <div className="rounded-2xl glass-panel p-5 border-2 border-white/[0.1] shadow-sm mb-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-white/[0.08] animate-pulse rounded w-1/3"></div>
          <div className="h-4 bg-white/[0.08] animate-pulse rounded w-24"></div>
        </div>
        <div className="h-24 glass-card rounded-xl mb-4"></div>
        <div className="h-4 bg-white/[0.08] animate-pulse rounded w-1/2"></div>
      </div>
    );
  }

  if (!data) return null;

  const isLowConfidence = data.confidence_score < 0.1 || data.active_maintainer_count === 0;
  const heatmap = data.hourly_heatmap || new Array(24).fill(0);
  const peakHour = data.peak_hour_utc ?? 14;
  const primaryStart = data.primary_start_hour_utc ?? 14;
  const primaryEnd = data.primary_end_hour_utc ?? 18;
  const dayWindow = data.recommended_day_window || "Tuesday - Thursday";

  const getBarColor = (val: number, isPeak: boolean) => {
    if (isPeak) return "bg-emerald-500 hover:bg-emerald-400";
    if (val > 0.6) return "bg-emerald-600 hover:bg-emerald-500";
    if (val > 0.25) return "bg-emerald-700/80 hover:bg-emerald-600";
    if (val > 0.05) return "bg-emerald-950/80 border border-emerald-800/80 hover:bg-emerald-900";
    return "bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.1]";
  };

  const userTimezone = isMounted ? getUserTimeZone() : "UTC";
  const localPeakTime = isMounted ? formatUTCHourToLocal(peakHour) : `${padZero(peakHour)}:00 UTC`;
  const localWindow = isMounted ? formatUTCRangeToLocal(primaryStart, primaryEnd) : `${padZero(primaryStart)}:00 - ${padZero(primaryEnd)}:00 UTC`;

  return (
    <div className="rounded-2xl glass-panel p-5 sm:p-6 border-2 border-white/[0.1] shadow-sm mb-6 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-sm">
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-space">
              Optimal PR Submission Window
            </h3>
            <p className="text-[11px] font-sans text-zinc-300">
              Maintainer review activity heatmap & prime window prediction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            data-testid="recommended-day-window"
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/70 border-emerald-800/80 text-emerald-300 border border-emerald-200/80"
          >
            <Calendar className="h-3 w-3 text-emerald-600" />
            {dayWindow}
          </span>
          <span
            className={`text-[11px] font-sans px-2 py-0.5 rounded-full border ${
              isLowConfidence
                ? "bg-amber-950/70 border-amber-800/80 text-amber-300 border-amber-200"
                : "bg-emerald-950/70 border-emerald-800/80 text-emerald-300 border-emerald-200"
            }`}
          >
            {isLowConfidence ? "Low Data Confidence" : `Confidence: ${(data.confidence_score * 100).toFixed(0)}%`}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 font-sans">
        <div className="glass-card border border-white/[0.1] rounded-xl p-3">
          <div className="text-xs text-zinc-300 flex items-center gap-1 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Peak Review Hour</span>
          </div>
          <div data-testid="peak-hour-metric" className="text-lg font-bold font-mono text-white">
            {padZero(peakHour)}:00 UTC
          </div>
          <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
            {isMounted ? `≈ ${localPeakTime} (Local)` : "Calculating local time..."}
          </p>
        </div>

        <div className="glass-card border border-white/[0.1] rounded-xl p-3">
          <div className="text-xs text-zinc-300 flex items-center gap-1 mb-1">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>Primary Window</span>
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {padZero(primaryStart)}:00 - {padZero(primaryEnd)}:00 UTC
          </div>
          <p className="text-[11px] font-mono text-blue-700 mt-0.5">
            {isMounted ? `≈ ${localWindow} (Local)` : "Calculating local time..."}
          </p>
        </div>

        <div className="glass-card border border-white/[0.1] rounded-xl p-3">
          <div className="text-xs text-zinc-300 flex items-center gap-1 mb-1">
            <Globe className="h-3.5 w-3.5 text-indigo-600" />
            <span>Active Maintainers</span>
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {data.active_maintainer_count > 0 ? `${data.active_maintainer_count} Tracked` : "Heuristic Estimate"}
          </div>
          <p className="text-[11px] text-zinc-300 mt-0.5 truncate" title={userTimezone}>
            Detected: {userTimezone}
          </p>
        </div>
      </div>

      {/* 24-Hour Activity Bar Heatmap */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-zinc-300 mb-2 font-sans">
          <span>24-Hour Maintainer Activity Heatmap (UTC)</span>
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <span>Low</span>
            <span className="inline-block w-2.5 h-2.5 bg-emerald-950/80 border-emerald-800/80 rounded-xs"></span>
            <span className="inline-block w-2.5 h-2.5 bg-emerald-300 rounded-xs"></span>
            <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-xs"></span>
            <span className="inline-block w-2.5 h-2.5 bg-emerald-700 rounded-xs"></span>
            <span>Peak</span>
          </div>
        </div>

        <div className="glass-card border border-white/[0.1] rounded-xl p-3 sm:p-4">
          <div className="flex items-end gap-1 sm:gap-1.5 h-24 w-full">
            {heatmap.map((val, h) => {
              const isPeak = h === peakHour;
              const heightPercent = Math.max(12, Math.round(val * 100));
              const localHourStr = isMounted ? formatUTCHourToLocal(h) : `${padZero(h)}:00 UTC`;
              const activityLabel = isPeak
                ? "Peak Activity (100%)"
                : val > 0
                ? `${Math.round(val * 100)}% Activity`
                : "Inactive / Low Activity";

              return (
                <div
                  key={h}
                  data-testid={`heatmap-bar-${h}`}
                  title={`${padZero(h)}:00 UTC (${localHourStr} Local) - ${activityLabel}`}
                  aria-label={`${padZero(h)}:00 UTC (${localHourStr} Local) - ${activityLabel}`}
                  tabIndex={0}
                  className={`flex-1 rounded-t-sm transition-all duration-150 hover:-translate-y-0.5 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 ${getBarColor(
                    val,
                    isPeak
                  )}`}
                  style={{ height: `${heightPercent}%` }}
                />
              );
            })}
          </div>

          {/* Hour Labels */}
          <div className="flex justify-between text-[10px] font-mono text-zinc-300 mt-2 px-0.5">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>
      </div>

      {/* Explanatory Copy & Timezone Notice */}
      <div
        data-testid="optimal-time-explanation"
        className="rounded-xl glass-card border border-white/[0.1] p-3 text-xs font-sans text-zinc-300 space-y-1.5"
      >
        <p className="flex items-start gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Maintainers are most responsive around <strong>{padZero(peakHour)}:00 UTC</strong> (
            <strong>{localPeakTime}</strong> in your timezone). Recommended submission window is{" "}
            <strong>{dayWindow}</strong> from <strong>{padZero(primaryStart)}:00 to {padZero(primaryEnd)}:00 UTC</strong>{" "}
            ({localWindow} local).
          </span>
        </p>
        {isLowConfidence && (
          <p className="flex items-center gap-1.5 text-amber-300 text-[11px] pt-1 border-t border-white/[0.1]">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>
              Limited recent maintainer review activity recorded for this repository. Prediction based on heuristic baseline.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
