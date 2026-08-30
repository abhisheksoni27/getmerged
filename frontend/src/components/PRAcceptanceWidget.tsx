"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Percent, Users, ShieldAlert, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { ShareForecastButton } from "@/components/ShareForecastButton";

interface PRAcceptanceWidgetProps {
  owner: string;
  name: string;
  initialData?: PRLikelihoodData | null;
}

export interface PRLikelihoodData {
  repository: string;
  c_rank_tier: string;
  overall_acceptance_rate: number | null;
  first_timer_acceptance_rate: number | null;
  repeat_contributor_acceptance_rate: number | null;
  response_time_p50_hours: number | null;
  response_time_p90_hours: number | null;
  median_time_to_merge_hours: number | null;
  bus_factor: number;
  staleness_flag: boolean;
  calculated_at: string | null;
}

export function PRAcceptanceWidget({ owner, name, initialData = null }: PRAcceptanceWidgetProps) {
  const [data, setData] = useState<PRLikelihoodData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }
    let isMounted = true;
    async function fetchLikelihood() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/pr-likelihood?name=${encodeURIComponent(`${owner}/${name}`)}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setData(json);
        }
      } catch (err) {
        console.error("Failed to load PR likelihood", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLikelihood();
    return () => {
      isMounted = false;
    };
  }, [owner, name]);

  if (loading) {
    return (
      <div className="rounded-2xl glass-panel p-5 border-2 border-white/[0.1] shadow-sm mb-6 animate-pulse">
        <div className="h-5 bg-zinc-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="h-16 glass-card rounded-xl"></div>
          <div className="h-16 glass-card rounded-xl"></div>
          <div className="h-16 glass-card rounded-xl"></div>
          <div className="h-16 glass-card rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-2xl glass-panel p-5 border-2 border-white/[0.1] shadow-sm mb-6 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <h3 className="text-base font-bold text-white font-space">
            PR Acceptance & Review Speed Forecast
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ShareForecastButton
            repoFullName={`${owner}/${name}`}
            overallScore={data.overall_acceptance_rate}
            readyToMerge={data.overall_acceptance_rate !== null ? data.overall_acceptance_rate >= 50 : undefined}
            variant="compact"
          />
          <Link
            href={`/preflight?repo=${encodeURIComponent(`${owner}/${name}`)}`}
            data-testid="pr-preflight-cta"
            title={`Run pre-flight evaluation for ${owner}/${name}`}
            aria-label={`Run pre-flight evaluation for ${owner}/${name}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white border border-emerald-800 hover:bg-emerald-500 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 active:scale-[0.98] shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            <span>Run Pre-flight PR Check</span>
            <ArrowRight className="h-3 w-3 text-white" aria-hidden="true" />
          </Link>
          <span className="text-[11px] font-sans text-zinc-300 glass-card px-2 py-0.5 rounded-full">
            Precomputed via Live PR Events
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 font-sans">
        {/* Overall Acceptance Rate */}
        <div className="glass-card border border-white/[0.1] rounded-xl p-3">
          <div className="flex items-center gap-1 text-xs text-zinc-300 mb-1">
            <Percent className="h-3.5 w-3.5 text-emerald-600" />
            <span>Overall Merge Odds</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {data.overall_acceptance_rate !== null ? `${data.overall_acceptance_rate.toFixed(1)}%` : "N/A"}
          </div>
          <p className="text-[10px] text-zinc-300 mt-0.5">External PR acceptance</p>
        </div>

        {/* First-Timer Acceptance Rate */}
        <div className="glass-card border border-white/[0.1] rounded-xl p-3">
          <div className="flex items-center gap-1 text-xs text-zinc-300 mb-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>First-Timer Rate</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {data.first_timer_acceptance_rate !== null ? `${data.first_timer_acceptance_rate.toFixed(1)}%` : "N/A"}
          </div>
          <p className="text-[10px] text-zinc-300 mt-0.5">First PR success rate</p>
        </div>

        {/* Median Response Time (p50) */}
        <div className="glass-card border border-white/[0.1] rounded-xl p-3">
          <div className="flex items-center gap-1 text-xs text-zinc-300 mb-1">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>Median Response (p50)</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {data.response_time_p50_hours !== null
              ? data.response_time_p50_hours < 1
                ? "<1h"
                : `${Math.round(data.response_time_p50_hours)}h`
              : "N/A"}
          </div>
          <p className="text-[10px] text-zinc-300 mt-0.5">50% receive response in</p>
        </div>

        {/* Long-tail Response Time (p90) */}
        <div className="glass-card border border-white/[0.1] rounded-xl p-3">
          <div className="flex items-center gap-1 text-xs text-zinc-300 mb-1">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Tail Latency (p90)</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {data.response_time_p90_hours !== null
              ? data.response_time_p90_hours < 24
                ? `${Math.round(data.response_time_p90_hours)}h`
                : `${Math.round(data.response_time_p90_hours / 24)}d`
              : "N/A"}
          </div>
          <p className="text-[10px] text-zinc-300 mt-0.5">90% receive response in</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] font-sans text-zinc-300 pt-2 border-t border-white/[0.1]">
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-zinc-300" /> Active Maintainers:{" "}
          <strong className="font-mono text-zinc-200">{data.bus_factor}</strong>
        </span>
        {data.staleness_flag && (
          <span className="flex items-center gap-1 text-amber-700 bg-amber-950/70 border-amber-800/80 px-2 py-0.5 rounded">
            <ShieldAlert className="h-3.5 w-3.5" /> High staleness risk (no recent merges)
          </span>
        )}
      </div>
    </div>
  );
}
