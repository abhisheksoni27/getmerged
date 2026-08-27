"use client";

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

interface TrendPoint {
  snapshot_date: string;
  c_rank_score: number;
  c_rank_tier: string;
}

interface TrendResponse {
  repository_id: string;
  full_name: string;
  days: number;
  trend: TrendPoint[];
}

const TIER_COLORS: Record<string, string> = {
  S: "#059669",
  A: "#2563eb",
  B: "#d97706",
  C: "#dc2626",
  D: "#71717a",
};

export function RepoTrendChart({ repoId }: { repoId: string }) {
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(repoId)}/trend?days=90`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch failed"))))
      .then((data: TrendResponse) => setTrend(data.trend))
      .catch(() => setError(true));
  }, [repoId]);

  if (error) return null;
  if (trend === null) {
    return (
      <div className="h-32 rounded-2xl border border-white/[0.08] bg-zinc-900 animate-pulse" aria-busy="true" />
    );
  }
  if (trend.length < 2) {
    return null; // Not enough data for a meaningful trend
  }

  const W = 600;
  const H = 140;
  const PAD = 8;
  const scores = trend.map((p) => p.c_rank_score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  const points = trend.map((p, i) => {
    const x = PAD + (i / (trend.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p.c_rank_score - min) / range) * (H - PAD * 2);
    return { ...p, x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${H} L${points[0].x.toFixed(1)},${H} Z`;
  const strokeColor = TIER_COLORS[trend[trend.length - 1].c_rank_tier] ?? "#18181b";
  const first = scores[0];
  const last = scores[scores.length - 1];
  const delta = last - first;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 p-5 shadow-xs" aria-label="C-Rank score trend">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-space text-sm font-bold text-white">C-Rank Trend</h3>
        <span
          className={`font-mono text-xs font-bold ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}
          title={`Score changed by ${delta.toFixed(1)} over the shown period`}
        >
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`C-Rank score from ${min} to ${max}`}>
        <path d={areaPath} fill={strokeColor} opacity="0.08" />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={strokeColor} />
      </svg>
      <div className="flex items-center justify-between mt-2 font-mono text-[10px] text-zinc-300">
        <span>{trend[0].snapshot_date}</span>
        <span>
          {min.toFixed(0)}–{max.toFixed(0)} score
        </span>
        <span>{trend[trend.length - 1].snapshot_date}</span>
      </div>
    </section>
  );
}
