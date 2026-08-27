import React from "react";

export type CRankTier = "S" | "A" | "B" | "C" | "D" | string;

interface CRankBadgeProps {
  rank?: CRankTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function getGradeColor(rank?: string): { hex: string; bgClass: string; textClass: string; borderClass: string; dotClass: string; label: string } {
  switch (rank?.toUpperCase()) {
    case "S":
      return {
        hex: "#34d399",
        bgClass: "bg-emerald-500/10",
        textClass: "text-emerald-400",
        borderClass: "border-emerald-500/20",
        dotClass: "bg-emerald-400",
        label: "Elite",
      };
    case "A":
      return {
        hex: "#60a5fa",
        bgClass: "bg-blue-500/10",
        textClass: "text-blue-400",
        borderClass: "border-blue-500/20",
        dotClass: "bg-blue-400",
        label: "Welcoming",
      };
    case "B":
      return {
        hex: "#a78bfa",
        bgClass: "bg-purple-500/10",
        textClass: "text-purple-400",
        borderClass: "border-purple-500/20",
        dotClass: "bg-purple-400",
        label: "Solid",
      };
    case "C":
      return {
        hex: "#fbbf24",
        bgClass: "bg-amber-500/10",
        textClass: "text-amber-400",
        borderClass: "border-amber-500/20",
        dotClass: "bg-amber-400",
        label: "Moderate",
      };
    case "D":
      return {
        hex: "#f87171",
        bgClass: "bg-rose-500/10",
        textClass: "text-rose-400",
        borderClass: "border-rose-500/20",
        dotClass: "bg-rose-400",
        label: "Risky",
      };
    default:
      return {
        hex: "#a1a1aa",
        bgClass: "bg-zinc-800/40",
        textClass: "text-zinc-400",
        borderClass: "border-zinc-700/40",
        dotClass: "bg-zinc-400",
        label: "Unscored",
      };
  }
}

export function CRankBadge({ rank = "A", size = "md", showLabel = false, className = "" }: CRankBadgeProps) {
  const grade = getGradeColor(rank);
  const normalizedRank = rank?.toUpperCase() || "A";

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs gap-2",
    lg: "px-3.5 py-1.5 text-sm gap-2.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-mono font-medium border backdrop-blur-md shadow-xs ${grade.bgClass} ${grade.textClass} ${grade.borderClass} ${sizeClasses} ${className}`}
      title={`C-Rank Grade ${normalizedRank} (${grade.label})`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${grade.dotClass}`} />
      <span className="font-bold tracking-tight">{normalizedRank}</span>
      {showLabel && <span className="opacity-80 font-sans text-xs font-normal">· {grade.label}</span>}
    </span>
  );
}
