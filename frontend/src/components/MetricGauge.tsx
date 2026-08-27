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
    <div className={`flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06] shadow-sm ${className}`}>
      <div className="font-space text-base sm:text-lg font-bold tracking-tight text-white mb-1.5">{value}</div>
      
      {/* Sleek Segmented Indicator with glow */}
      <div className="flex items-center gap-1.5 my-1" aria-label={`${label}: ${percentage}%`}>
        {Array.from({ length: totalSegments }).map((_, i) => {
          const isFilled = i < Math.floor(scoreOutOf5);
          const isPartial = !isFilled && i < scoreOutOf5;
          return (
            <span
              key={i}
              className={`h-1.5 w-3.5 rounded-full transition-all duration-300 ${
                isFilled
                  ? `${grade.dotClass} shadow-[0_0_6px_rgba(255,255,255,0.4)]`
                  : isPartial
                  ? `${grade.dotClass} opacity-50`
                  : "bg-zinc-800/80"
              }`}
            />
          );
        })}
      </div>
      
      <div className="text-xs font-sans text-zinc-300 font-semibold tracking-normal mt-1">{label}</div>
    </div>
  );
}
