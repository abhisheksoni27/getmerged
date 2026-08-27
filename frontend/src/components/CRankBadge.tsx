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
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md font-mono font-bold tracking-wider uppercase text-white shadow-sm ${grade.bgClass} ${sizeClasses} ${className}`}
      title={`C-Rank Grade ${normalizedRank} (${grade.label})`}
    >
      <span className="font-extrabold">{normalizedRank}</span>
      {showLabel && <span className="opacity-95 font-sans font-medium text-xs">· {grade.label}</span>}
    </span>
  );
}
