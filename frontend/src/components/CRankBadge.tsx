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
        hex: "#0D9668",
        bgClass: "bg-[#0D9668]/10",
        textClass: "text-[#0D9668]",
        borderClass: "border-[#0D9668]/30",
        dotClass: "bg-[#0D9668]",
        label: "Elite",
        title: "Super Welcoming",
      };
    case "A":
      return {
        hex: "#2D8ABF",
        bgClass: "bg-[#2D8ABF]/10",
        textClass: "text-[#2D8ABF]",
        borderClass: "border-[#2D8ABF]/30",
        dotClass: "bg-[#2D8ABF]",
        label: "Welcoming",
        title: "Very Welcoming",
      };
    case "B":
      return {
        hex: "#8B6BB5",
        bgClass: "bg-[#8B6BB5]/10",
        textClass: "text-[#8B6BB5]",
        borderClass: "border-[#8B6BB5]/30",
        dotClass: "bg-[#8B6BB5]",
        label: "Solid",
        title: "Welcoming",
      };
    case "C":
      return {
        hex: "#C4910A",
        bgClass: "bg-[#C4910A]/10",
        textClass: "text-[#C4910A]",
        borderClass: "border-[#C4910A]/30",
        dotClass: "bg-[#C4910A]",
        label: "Moderate",
        title: "Slow Review",
      };
    case "D":
    default:
      return {
        hex: "#C4463A",
        bgClass: "bg-[#C4463A]/10",
        textClass: "text-[#C4463A]",
        borderClass: "border-[#C4463A]/30",
        dotClass: "bg-[#C4463A]",
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
    sm: "px-2 py-0.5 text-xs font-mono font-bold rounded-md",
    md: "px-2.5 py-1 text-sm font-mono font-bold rounded-lg",
    lg: "px-3.5 py-1.5 text-base font-mono font-extrabold rounded-xl",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border ${grade.bgClass} ${grade.textClass} ${grade.borderClass} ${sizeClasses[size]} ${className}`}
      title={`C-Rank: ${grade.title}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${grade.dotClass}`} />
      <span>{rank.toUpperCase()}</span>
      {showLabel && <span className="opacity-80 font-normal">· {grade.label}</span>}
    </span>
  );
}
