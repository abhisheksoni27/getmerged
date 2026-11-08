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
        hex: "#A371F7",
        bgClass: "bg-[rgba(163,113,247,0.15)]",
        textClass: "text-[var(--purple-bright)]",
        borderClass: "border-[rgba(163,113,247,0.35)]",
        dotClass: "bg-[var(--purple-bright)] shadow-[0_0_8px_var(--purple-bright)]",
        label: "Elite",
        title: "Super Welcoming",
      };
    case "A":
      return {
        hex: "#3FB950",
        bgClass: "bg-[rgba(63,185,80,0.15)]",
        textClass: "text-[var(--green-bright)]",
        borderClass: "border-[rgba(63,185,80,0.35)]",
        dotClass: "bg-[var(--green-bright)]",
        label: "Welcoming",
        title: "Very Welcoming",
      };
    case "B":
      return {
        hex: "#D29922",
        bgClass: "bg-[rgba(210,153,34,0.15)]",
        textClass: "text-[var(--amber-bright)]",
        borderClass: "border-[rgba(210,153,34,0.35)]",
        dotClass: "bg-[var(--amber-bright)]",
        label: "Solid",
        title: "Welcoming",
      };
    case "C":
      return {
        hex: "#8B949E",
        bgClass: "bg-[rgba(139,148,158,0.15)]",
        textClass: "text-[var(--fg-muted)]",
        borderClass: "border-[rgba(139,148,158,0.3)]",
        dotClass: "bg-[var(--fg-muted)]",
        label: "Moderate",
        title: "Slow Review",
      };
    case "D":
    default:
      return {
        hex: "#F85149",
        bgClass: "bg-[rgba(248,81,73,0.15)]",
        textClass: "text-[#F85149]",
        borderClass: "border-[rgba(248,81,73,0.35)]",
        dotClass: "bg-[#F85149]",
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
