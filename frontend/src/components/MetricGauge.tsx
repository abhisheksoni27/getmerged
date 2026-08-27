import React from "react";
import { getGradeColor } from "@/components/CRankBadge";

interface MetricGaugeProps {
  label: string;
  value: string | number;
  percentage?: number; // 0 to 100
  tier?: string;
  className?: string;
}

export function MetricGauge({ label, value, percentage = 0, tier = "A", className = "" }: MetricGaugeProps) {
  const grade = getGradeColor(tier);
  // Total 5 dots
  const totalDots = 5;
  const scoreOutOf5 = Math.min(5, Math.max(0, (percentage / 100) * 5));

  return (
    <div className={`flex flex-col items-center justify-center p-2 rounded-md ${className}`}>
      <div className="font-mono text-sm font-bold text-slate-100 mb-1">{value}</div>
      {/* 5-Dot gauge */}
      <div className="flex items-center gap-1 my-1" aria-label={`${label}: ${percentage}%`}>
        {Array.from({ length: totalDots }).map((_, i) => {
          const filled = i < Math.floor(scoreOutOf5);
          const isHalf = !filled && i < scoreOutOf5;
          return (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                filled
                  ? grade.bgClass
                  : isHalf
                  ? `${grade.bgClass} opacity-60`
                  : "bg-slate-700"
              }`}
            />
          );
        })}
      </div>
      <div className="text-[11px] font-mono text-slate-400 font-medium uppercase tracking-wider">{label}</div>
    </div>
  );
}
