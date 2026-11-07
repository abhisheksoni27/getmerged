import React from "react";

export type CRankTier = "S" | "A" | "B" | "C" | "D" | string;

interface CRankBadgeProps {
  rank?: CRankTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function getGradeColor(rank?: string): {
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  label: string;
  title: string;
} {
  switch (rank?.toUpperCase()) {
    case "S":
      return {
        hex: "#059669",
        bgClass: "bg-emerald-50",
        textClass: "text-emerald-700",
        borderClass: "border-emerald-200",
        dotClass: "bg-emerald-500",
        label: "Elite",
        title: "Super Welcoming",
      };
    case "A":
      return {
        hex: "#0284C7",
        bgClass: "bg-sky-50",
        textClass: "text-sky-700",
        borderClass: "border-sky-200",
        dotClass: "bg-sky-500",
        label: "Welcoming",
        title: "Very Welcoming",
      };
    case "B":
      return {
        hex: "#7C3AED",
        bgClass: "bg-purple-50",
        textClass: "text-purple-700",
        borderClass: "border-purple-200",
        dotClass: "bg-purple-500",
        label: "Solid",
        title: "Welcoming",
      };
    case "C":
      return {
        hex: "#D97706",
        bgClass: "bg-amber-50",
        textClass: "text-amber-700",
        borderClass: "border-amber-200",
        dotClass: "bg-amber-500",
        label: "Moderate",
        title: "Slow Review",
      };
    case "D":
    default:
      return {
        hex: "#DC2626",
        bgClass: "bg-rose-50",
        textClass: "text-rose-700",
        borderClass: "border-rose-200",
        dotClass: "bg-rose-500",
        label: "Risky",
        title: "High PR Stall Rate",
      };
  }
}

export function CRankBadge({
  rank = "B",
  size = "md",
  showLabel = false,
  className = "",
}: CRankBadgeProps) {
  const grade = getGradeColor(rank);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-mono font-bold rounded-md border",
    md: "px-2.5 py-1 text-xs font-mono font-bold rounded-lg border",
    lg: "px-3.5 py-1.5 text-sm font-mono font-bold rounded-lg border",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${grade.bgClass} ${grade.textClass} ${grade.borderClass} ${sizeClasses[size]} ${className}`}
      title={`C-Rank: ${grade.title}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${grade.dotClass}`} />
      <span>Tier {rank.toUpperCase()}</span>
      {showLabel && <span className="text-[11px] font-sans font-medium text-zinc-500">· {grade.label}</span>}
    </span>
  );
}
