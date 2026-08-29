"use client";

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { getGradeColor } from "@/components/CRankBadge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RepoTrendChart({ repoId }: { repoId: string }) {
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const [error, setError] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(repoId)}/trend?days=90`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch failed"))))
      .then((data: TrendResponse) => setTrend(data.trend))
      .catch(() => setError(true));
  }, [repoId]);

  if (error) return null;
  if (trend === null) {
    return (
      <div className="h-48 rounded-xl border border-white/[0.08] bg-[#141414] animate-pulse" aria-busy="true" />
    );
  }
  if (trend.length < 2) {
    return null; // Not enough data for a meaningful trend
  }

  const W = 620;
  const H = 150;
  const PAD_LEFT = 42;
  const PAD_RIGHT = 16;
  const PAD_TOP = 14;
  const PAD_BOTTOM = 16;

  const scores = trend.map((p) => p.c_rank_score);
  const minRaw = Math.min(...scores);
  const maxRaw = Math.max(...scores);

  // Pad the Y-axis so the line doesn't hit the extreme top/bottom edges
  const yMin = Math.max(0, Math.floor(minRaw - 4));
  const yMax = Math.min(100, Math.ceil(maxRaw + 4));
  const yRange = yMax - yMin || 1;

  // Generate 4 clear Y-axis tick levels
  const tickStep = (yMax - yMin) / 3;
  const yTicks = [
    { val: yMax, y: PAD_TOP },
    { val: Math.round(yMax - tickStep), y: PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * (1 / 3) },
    { val: Math.round(yMin + tickStep), y: PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * (2 / 3) },
    { val: yMin, y: H - PAD_BOTTOM },
  ];

  const plotW = W - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const points = trend.map((p, i) => {
    const x = PAD_LEFT + (i / (trend.length - 1)) * plotW;
    const y = H - PAD_BOTTOM - ((p.c_rank_score - yMin) / yRange) * plotH;
    return { ...p, x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${H - PAD_BOTTOM} L${points[0].x.toFixed(1)},${H - PAD_BOTTOM} Z`;

  const latestPoint = trend[trend.length - 1];
  const firstPoint = trend[0];
  const delta = latestPoint.c_rank_score - firstPoint.c_rank_score;
  const latestGrade = getGradeColor(latestPoint.c_rank_tier);

  const selectedPoint = activeIdx !== null ? points[activeIdx] : points[points.length - 1];

  return (
    <section
      className="rounded-xl border border-white/[0.08] bg-[#141414]/80 backdrop-blur-md p-5 shadow-sm"
      aria-label="90-day C-Rank score trajectory"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-sans text-sm font-semibold text-white">90-Day C-Rank Trajectory</h3>
            <span className="rounded bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-[#a3a3a3]">
              {trend.length} snapshots
            </span>
          </div>
          <p className="text-xs text-[#737373] mt-0.5">Historical health &amp; responsiveness evolution</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-white flex items-center justify-end gap-1">
              <span>{selectedPoint.c_rank_score.toFixed(1)}/100</span>
              <span className={`text-xs px-1.5 py-0.2 rounded border ${getGradeColor(selectedPoint.c_rank_tier).borderClass} ${getGradeColor(selectedPoint.c_rank_tier).textClass}`}>
                {selectedPoint.c_rank_tier}
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#a3a3a3]">
              {formatDate(selectedPoint.snapshot_date)}
            </div>
          </div>

          <div
            className={`flex items-center gap-1 font-mono text-xs font-bold px-2 py-1 rounded-lg border ${
              delta > 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : delta < 0
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-zinc-800 border-zinc-700 text-zinc-300"
            }`}
            title={`Score change: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} points over 90 days`}
          >
            {delta > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : delta < 0 ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            <span>{delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* SVG Chart with Dedicated Visible Y-Axis */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-32 overflow-visible select-none"
          role="img"
          aria-label={`Score progression from ${minRaw.toFixed(1)} to ${maxRaw.toFixed(1)}`}
          onMouseLeave={() => setActiveIdx(null)}
        >
          {/* Y-Axis Horizontal Grid Lines and Labels */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              {/* Visible dashed gridline */}
              <line
                x1={PAD_LEFT}
                y1={t.y}
                x2={W - PAD_RIGHT}
                y2={t.y}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="4 4"
              />
              {/* Left Y-axis tick mark */}
              <line
                x1={PAD_LEFT - 4}
                y1={t.y}
                x2={PAD_LEFT}
                y2={t.y}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1"
              />
              {/* High-contrast Y-axis numeric label */}
              <text
                x={PAD_LEFT - 8}
                y={t.y + 3.5}
                textAnchor="end"
                fill="#a3a3a3"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="500"
                className="select-none"
              >
                {t.val}
              </text>
            </g>
          ))}

          {/* Left Y-Axis Vertical Spine */}
          <line
            x1={PAD_LEFT}
            y1={PAD_TOP}
            x2={PAD_LEFT}
            y2={H - PAD_BOTTOM}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
          />

          {/* Shaded Area */}
          <path d={areaPath} fill={latestGrade.hex} fillOpacity="0.10" />

          {/* Main Stroke */}
          <path
            d={linePath}
            fill="none"
            stroke={latestGrade.hex}
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Active Vertical Guideline on Hover */}
          {activeIdx !== null && (
            <line
              x1={points[activeIdx].x}
              y1={PAD_TOP}
              x2={points[activeIdx].x}
              y2={H - PAD_BOTTOM}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          )}

          {/* Interactive touch/hover points */}
          {points.map((p, i) => {
            const isHovered = activeIdx === i;
            const isLatest = i === points.length - 1 && activeIdx === null;
            return (
              <g key={p.snapshot_date}>
                {/* Hit area */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="14"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveIdx(i)}
                />
                {/* Visible dot */}
                {(isHovered || isLatest) && (
                  <>
                    <circle cx={p.x} cy={p.y} r="6" fill={latestGrade.hex} fillOpacity="0.35" />
                    <circle cx={p.x} cy={p.y} r="3.5" fill={latestGrade.hex} stroke="#0a0a0a" strokeWidth="1.5" />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Axis Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06] font-mono text-[11px] text-[#737373]">
        <span className="pl-10">{formatDate(firstPoint.snapshot_date)}</span>
        <span>
          Range: <strong className="text-[#a3a3a3]">{minRaw.toFixed(1)} – {maxRaw.toFixed(1)}</strong> pts
        </span>
        <span>{formatDate(latestPoint.snapshot_date)}</span>
      </div>
    </section>
  );
}
