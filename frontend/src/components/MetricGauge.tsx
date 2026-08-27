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
    <div className={`flex flex-col items-center justify-center p-2.5 rounded-md ${className}`}>
      <div className="font-mono text-base font-bold text-slate-50 mb-1.5">{value}</div>
      {/* 5-Dot gauge */}
      <div className="flex items-center gap-1.5 my-1.5" aria-label={`${label}: ${percentage}%`}>
        {Array.from({ length: totalDots }).map((_, i) => {
          const filled = i < Math.floor(scoreOutOf5);
          const isHalf = !filled && i < scoreOutOf5;
          return (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
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
      <div className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider">{label}</div>
    </div>
  );
}
