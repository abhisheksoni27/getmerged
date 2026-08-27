import React from "react";

export type CRankTier = "S" | "A" | "B" | "C" | "D" | string;

interface CRankBadgeProps {
  rank?: CRankTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function getGradeColor(rank?: string): { hex: string; bgClass: string; textClass: string; borderClass: string; label: string } {
  switch (rank?.toUpperCase()) {
    case "S":
      return {
        hex: "#10b981",
        bgClass: "bg-[#10b981]",
        textClass: "text-white",
        borderClass: "border-[#10b981]",
        label: "Elite",
      };
    case "A":
      return {
        hex: "#3b82f6",
        bgClass: "bg-[#3b82f6]",
        textClass: "text-white",
        borderClass: "border-[#3b82f6]",
        label: "Welcoming",
      };
    case "B":
      return {
        hex: "#8b5cf6",
        bgClass: "bg-[#8b5cf6]",
        textClass: "text-white",
        borderClass: "border-[#8b5cf6]",
        label: "Solid",
      };
    case "C":
      return {
        hex: "#f59e0b",
        bgClass: "bg-[#f59e0b]",
        textClass: "text-white",
        borderClass: "border-[#f59e0b]",
        label: "Moderate",
      };
    case "D":
      return {
        hex: "#ef4444",
        bgClass: "bg-[#ef4444]",
        textClass: "text-white",
        borderClass: "border-[#ef4444]",
        label: "Risky",
      };
    default:
      return {
        hex: "#94a3b8",
        bgClass: "bg-slate-700",
        textClass: "text-slate-200",
        borderClass: "border-slate-600",
        label: "Unscored",
      };
  }
}

export function CRankBadge({ rank = "A", size = "md", showLabel = false, className = "" }: CRankBadgeProps) {
  const grade = getGradeColor(rank);
  const normalizedRank = rank?.toUpperCase() || "A";

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-semibold tracking-wider uppercase text-white shadow-xs ${grade.bgClass} ${sizeClasses} ${className}`}
      title={`C-Rank Grade ${normalizedRank} (${grade.label})`}
    >
      <span>{normalizedRank}</span>
      {showLabel && <span className="opacity-90 font-sans font-medium text-[11px]">· {grade.label}</span>}
    </span>
  );
}
