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
        hex: "#10b981",
        bgClass: "bg-emerald-500/15",
        textClass: "text-emerald-300",
        borderClass: "border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
        dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
        label: "Elite",
        title: "Super Welcoming",
      };
    case "A":
      return {
        hex: "#38bdf8",
        bgClass: "bg-sky-500/15",
        textClass: "text-sky-300",
        borderClass: "border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.15)]",
        dotClass: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]",
        label: "Welcoming",
        title: "Very Welcoming",
      };
    case "B":
      return {
        hex: "#c084fc",
        bgClass: "bg-purple-500/15",
        textClass: "text-purple-300",
        borderClass: "border-purple-500/30 shadow-[0_0_12px_rgba(192,132,252,0.15)]",
        dotClass: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]",
        label: "Solid",
        title: "Welcoming",
      };
    case "C":
      return {
        hex: "#fbbf24",
        bgClass: "bg-amber-500/15",
        textClass: "text-amber-300",
        borderClass: "border-amber-500/30 shadow-[0_0_12px_rgba(251,191,36,0.15)]",
        dotClass: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
        label: "Moderate",
        title: "Selective",
      };
    case "D":
      return {
        hex: "#f87171",
        bgClass: "bg-rose-500/15",
        textClass: "text-rose-300",
        borderClass: "border-rose-500/30 shadow-[0_0_12px_rgba(248,113,113,0.15)]",
        dotClass: "bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]",
        label: "Risky",
        title: "Hard Going",
      };
    default:
      return {
        hex: "#a1a1aa",
        bgClass: "bg-zinc-800/60",
        textClass: "text-zinc-300",
        borderClass: "border-zinc-700/60",
        dotClass: "bg-zinc-400",
        label: "Unranked",
        title: "Unranked",
      };
  }
}

export function CRankBadge({ rank = "A", size = "md", showLabel = true, className = "" }: CRankBadgeProps) {
  const grade = getGradeColor(rank);
  const normalizedRank = rank?.toUpperCase() || "A";

  const sizeClasses = {
    sm: "px-3 py-1 text-xs gap-2",
    md: "px-3.5 py-1.5 text-xs gap-2.5",
    lg: "px-4 py-2 text-sm gap-3",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-mono font-bold border backdrop-blur-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] cursor-default select-none ${grade.bgClass} ${grade.textClass} ${grade.borderClass} ${sizeClasses} ${className}`}
      title={`C-Rank Grade ${normalizedRank} (${grade.title})`}
    >
      <span className={`h-2 w-2 rounded-full animate-pulse ${grade.dotClass}`} />
      <span className="font-extrabold tracking-tight">{normalizedRank}</span>
      {showLabel && (
        <span className="font-sans font-semibold tracking-normal text-white">
          • {grade.label}
        </span>
      )}
    </span>
  );
}
