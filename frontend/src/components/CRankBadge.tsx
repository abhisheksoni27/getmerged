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
        hex: "#10B981",
        bgClass: "bg-[#10B981]",
        textClass: "text-black",
        borderClass: "border-black",
        dotClass: "bg-black",
        label: "ELITE",
        title: "Super Welcoming",
      };
    case "A":
      return {
        hex: "#38BDF8",
        bgClass: "bg-[#38BDF8]",
        textClass: "text-black",
        borderClass: "border-black",
        dotClass: "bg-black",
        label: "WELCOMING",
        title: "Very Welcoming",
      };
    case "B":
      return {
        hex: "#A855F7",
        bgClass: "bg-[#A855F7]",
        textClass: "text-white",
        borderClass: "border-black",
        dotClass: "bg-white",
        label: "SOLID",
        title: "Welcoming",
      };
    case "C":
      return {
        hex: "#FACC15",
        bgClass: "bg-[#FACC15]",
        textClass: "text-black",
        borderClass: "border-black",
        dotClass: "bg-black",
        label: "MODERATE",
        title: "Slow Review",
      };
    case "D":
    default:
      return {
        hex: "#EF4444",
        bgClass: "bg-[#EF4444]",
        textClass: "text-white",
        borderClass: "border-black",
        dotClass: "bg-white",
        label: "RISKY",
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
    sm: "px-2 py-0.5 text-xs font-mono font-black rounded-none border-2 border-black shadow-[2px_2px_0px_0px_#000]",
    md: "px-2.5 py-1 text-sm font-mono font-black rounded-none border-2 border-black shadow-[2px_2px_0px_0px_#000]",
    lg: "px-3.5 py-1.5 text-base font-mono font-black rounded-none border-2 border-black shadow-[3px_3px_0px_0px_#000]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${grade.bgClass} ${grade.textClass} ${sizeClasses[size]} ${className}`}
      title={`C-Rank: ${grade.title}`}
    >
      <span className={`h-2 w-2 border border-black ${grade.dotClass}`} />
      <span>{rank.toUpperCase()}</span>
      {showLabel && <span className="font-mono font-bold tracking-tight text-[11px]">[{grade.label}]</span>}
    </span>
  );
}
