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
    <div className={`flex flex-col items-center justify-center p-3 rounded-2xl bg-black/40 border border-white/[0.08] shadow-inner ${className}`}>
      <div className="font-space text-lg sm:text-xl font-black tracking-tight text-white mb-2">{value}</div>
      
      {/* Sleek Segmented Indicator with non-overlapping gap */}
      <div className="flex items-center gap-1.5 my-1.5 px-1" aria-label={`${label}: ${percentage}%`}>
        {Array.from({ length: totalSegments }).map((_, i) => {
          const isFilled = i < Math.floor(scoreOutOf5);
          const isPartial = !isFilled && i < scoreOutOf5;
          return (
            <span
              key={i}
              className={`h-1.5 w-3.5 rounded-full transition-all duration-300 shrink-0 ${
                isFilled
                  ? `${grade.dotClass} shadow-[0_0_8px_rgba(255,255,255,0.4)]`
                  : isPartial
                  ? `${grade.dotClass} opacity-40`
                  : "bg-zinc-800"
              }`}
            />
          );
        })}
      </div>
      
      <div className="text-xs font-sans text-zinc-300 font-bold tracking-tight mt-1">{label}</div>
    </div>
  );
}
