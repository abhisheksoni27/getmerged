"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, TrendingUp, Users, Clock, Sparkles } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface OrgPeerBenchmarks {
  cohort_size: number;
  score_percentile: number;
  response_p50_percentile: number;
  response_p90_percentile: number;
  first_timer_percentile: number;
  bus_factor_percentile: number;
}

interface OrgConsolePayload {
  org: string;
  has_data: boolean;
  repo_count: number;
  scored_repo_count: number;
  c_rank_score: number;
  c_rank_tier: string;
  response_p50_hours: number;
  response_p90_hours: number;
  first_timer_success_rate: number;
  bus_factor: number;
  entitled: boolean;
  peer_benchmarks?: OrgPeerBenchmarks | null;
}

function percentileLabel(pct: number | undefined): string {
  if (typeof pct !== "number" || Number.isNaN(pct)) return " - ";
  return `Top ${Math.max(1, Math.round(100 - pct))}%`;
}

export function OrgConsoleCard({ org }: { org: string }) {
  const [data, setData] = useState<OrgConsolePayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!org) return;
    let active = true;
    fetch(`${API_BASE_URL}/api/v1/orgs/${encodeURIComponent(org)}/console`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((payload) => {
        if (active) setData(payload as OrgConsolePayload);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [org]);

  if (failed || !data) return null;

  // Zero-repo org: empty state with claim CTA (AC4).
  if (!data.has_data && data.repo_count === 0) {
    return (
      <div className="mb-8 p-6 rounded-2xl border border-dashed border-zinc-300 bg-white text-center">
        <p className="text-sm text-zinc-600 font-sans">No repositories tracked for <strong>{org}</strong> yet.</p>
        <Link
          href="/repos"
          className="mt-3 inline-flex px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs items-center gap-1.5"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Claim a repository
        </Link>
      </div>
    );
  }

  // Repos exist but none have usable metrics yet (AC4).
  if (!data.has_data) {
    return (
      <div className="mb-8 p-6 rounded-2xl border border-zinc-200/80 bg-white text-center">
        <p className="text-sm text-zinc-600 font-sans">No data - metrics are not available for any {org} repository yet.</p>
      </div>
    );
  }

  const tierColor =
    data.c_rank_tier === "S" || data.c_rank_tier === "A"
      ? "bg-emerald-100 text-emerald-800"
      : data.c_rank_tier === "B"
        ? "bg-amber-100 text-amber-800"
        : "bg-orange-100 text-orange-800";

  return (
    <div className="mb-8 p-5 sm:p-6 rounded-2xl border border-zinc-200/80 bg-white shadow-xs">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 text-white text-xs font-mono font-bold">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Org C-Rank™ Console
        </span>
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${tierColor}`}>
          Aggregate Tier {data.c_rank_tier} ({Math.round(data.c_rank_score)})
        </span>
        <span className="text-xs font-mono text-zinc-500">
          {data.scored_repo_count}/{data.repo_count} repos scored
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
          <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> Response P50</span>
          <p className="font-space text-base font-bold text-zinc-900 mt-0.5">{data.response_p50_hours > 0 ? `${data.response_p50_hours.toFixed(1)}h` : "N/A"}</p>
          {data.peer_benchmarks && <p className="text-[10px] font-mono text-emerald-700 mt-0.5">{percentileLabel(data.peer_benchmarks.response_p50_percentile)} of peers</p>}
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
          <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> Response P90</span>
          <p className="font-space text-base font-bold text-zinc-900 mt-0.5">{data.response_p90_hours > 0 ? `${data.response_p90_hours.toFixed(1)}h` : "N/A"}</p>
          {data.peer_benchmarks && <p className="text-[10px] font-mono text-emerald-700 mt-0.5">{percentileLabel(data.peer_benchmarks.response_p90_percentile)} of peers</p>}
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
          <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1"><Sparkles className="h-3 w-3 text-purple-500" /> First-Timer Success</span>
          <p className="font-space text-base font-bold text-zinc-900 mt-0.5">{data.first_timer_success_rate.toFixed(0)}%</p>
          {data.peer_benchmarks && <p className="text-[10px] font-mono text-emerald-700 mt-0.5">{percentileLabel(data.peer_benchmarks.first_timer_percentile)} of peers</p>}
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
          <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1"><Users className="h-3 w-3 text-blue-500" /> Bus Factor</span>
          <p className="font-space text-base font-bold text-zinc-900 mt-0.5">{data.bus_factor} maintainers</p>
          {data.peer_benchmarks && <p className="text-[10px] font-mono text-emerald-700 mt-0.5">{percentileLabel(data.peer_benchmarks.bus_factor_percentile)} of peers</p>}
        </div>
      </div>

      {data.entitled && data.peer_benchmarks && (
        <p className="mt-4 text-xs font-mono text-zinc-600">
          Peer benchmark vs {data.peer_benchmarks.cohort_size} orgs · overall{" "}
          <strong className="text-emerald-700">{percentileLabel(data.peer_benchmarks.score_percentile)}</strong>
        </p>
      )}
      {data.entitled && !data.peer_benchmarks && (
        <p className="mt-4 text-xs font-mono text-zinc-500">Not enough peers yet - benchmarks unlock at 10+ ranked orgs.</p>
      )}
      {!data.entitled && (
        <p className="mt-4 text-xs font-mono text-zinc-600">
          Peer benchmarks are part of Maintainer Pro.{" "}
          <Link href="/pricing" className="font-bold text-emerald-700 underline underline-offset-2">Upgrade</Link>{" "}
          to compare {org} against every ranked org and earn the Verified Welcoming Org badge.
        </p>
      )}
    </div>
  );
}
