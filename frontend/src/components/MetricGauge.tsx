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
    <div className={`flex flex-col items-center justify-center p-2.5 rounded-lg ${className}`}>
      <div className="font-mono text-sm font-semibold tracking-tight text-zinc-100 mb-1.5">{value}</div>
      
      {/* Sleek Segmented Indicator (Apple Watch/HUD style) */}
      <div className="flex items-center gap-1 my-1" aria-label={`${label}: ${percentage}%`}>
        {Array.from({ length: totalSegments }).map((_, i) => {
          const isFilled = i < Math.floor(scoreOutOf5);
          const isPartial = !isFilled && i < scoreOutOf5;
          return (
            <span
              key={i}
              className={`h-1.5 w-3 rounded-full transition-all duration-300 ${
                isFilled
                  ? `${grade.dotClass} shadow-[0_0_8px_rgba(255,255,255,0.2)]`
                  : isPartial
                  ? `${grade.dotClass} opacity-40`
                  : "bg-zinc-800"
              }`}
            />
          );
        })}
      </div>
      
      <div className="text-[11px] font-mono text-zinc-400 font-medium tracking-wide">{label}</div>
    </div>
  );
}
