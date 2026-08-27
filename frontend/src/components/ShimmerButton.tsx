"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface ShimmerButtonProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
}

export function ShimmerButton({
  children,
  className = "",
  onClick,
  background = "rgba(9, 9, 11, 1)",
}: ShimmerButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-white/[0.08] px-5 py-2.5 font-mono text-xs font-medium text-white transition-all hover:scale-105 active:scale-95 shadow-md ${className}`}
      style={{ background }}
    >
      {/* Shimmer sweep animation ray */}
      <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
      
      <span className="relative z-10 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
        {children}
      </span>
    </button>
  );
}
