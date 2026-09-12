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
    <div className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-black/50 border border-white/[0.08] shadow-inner ${className}`}>
      {/* High contrast bold number */}
      <div className="font-space text-lg sm:text-xl font-black tracking-tight text-white mb-2">{value}</div>
      
      {/* 5 Distinct Non-Overlapping Pills */}
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
              className={`h-1.5 flex-1 max-w-[14px] rounded-full transition-all duration-300 ${
                isFilled
                  ? `${grade.dotClass} shadow-[0_0_8px_rgba(255,255,255,0.45)]`
                  : isPartial
                  ? `${grade.dotClass} opacity-40`
                  : "bg-zinc-800/90"
              }`}
            />
          );
        })}
      </div>
      
      <div className="text-[11px] sm:text-xs font-sans text-zinc-300 font-bold tracking-tight mt-1">{label}</div>
    </div>
  );
}
