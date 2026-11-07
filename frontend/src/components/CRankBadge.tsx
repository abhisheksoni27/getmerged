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
        bgClass: "bg-[#059669]/10",
        textClass: "text-[#059669]",
        borderClass: "border-[#059669]/30",
        dotClass: "bg-[#059669]",
        label: "Elite",
        title: "Super Welcoming",
      };
    case "A":
      return {
        hex: "#2563EB",
        bgClass: "bg-[#2563EB]/10",
        textClass: "text-[#2563EB]",
        borderClass: "border-[#2563EB]/30",
        dotClass: "bg-[#2563EB]",
        label: "Welcoming",
        title: "Very Welcoming",
      };
    case "B":
      return {
        hex: "#7C3AED",
        bgClass: "bg-[#7C3AED]/10",
        textClass: "text-[#7C3AED]",
        borderClass: "border-[#7C3AED]/30",
        dotClass: "bg-[#7C3AED]",
        label: "Solid",
        title: "Welcoming",
      };
    case "C":
      return {
        hex: "#D97706",
        bgClass: "bg-[#D97706]/10",
        textClass: "text-[#D97706]",
        borderClass: "border-[#D97706]/30",
        dotClass: "bg-[#D97706]",
        label: "Moderate",
        title: "Slow Review",
      };
    case "D":
    default:
      return {
        hex: "#DC2626",
        bgClass: "bg-[#DC2626]/10",
        textClass: "text-[#DC2626]",
        borderClass: "border-[#DC2626]/30",
        dotClass: "bg-[#DC2626]",
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
