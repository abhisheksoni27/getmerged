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
  const totalSegments = 5;
  const scoreOutOf5 = Math.min(5, Math.max(0, (percentage / 100) * 5));

  return (
    <div className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs ${className}`}>
      {/* High contrast bold number */}
      <div className="font-mono text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)] mb-1">{value}</div>
      
      {/* 5 Distinct Non-Overlapping Segment Pills */}
      <div
        className="w-full flex items-center justify-center gap-1 sm:gap-1.5 my-1.5 px-0.5"
        role="meter"
        aria-label={label}
        aria-valuenow={Math.min(100, Math.max(0, percentage))}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {Array.from({ length: totalSegments }).map((_, i) => {
          const isFilled = i < Math.floor(scoreOutOf5);
          const isPartial = !isFilled && i < scoreOutOf5;
          return (
            <div
              key={i}
              className={`h-1.5 flex-1 max-w-[16px] rounded-full transition-all duration-300 ${
                isFilled
                  ? `${grade.dotClass}`
                  : isPartial
                  ? `${grade.dotClass} opacity-40`
                  : "bg-[var(--border-subtle)]"
              }`}
            />
          );
        })}
      </div>
      
      <div className="text-xs font-mono text-[var(--text-secondary)] font-semibold tracking-wider uppercase mt-0.5">{label}</div>
    </div>
  );
}
