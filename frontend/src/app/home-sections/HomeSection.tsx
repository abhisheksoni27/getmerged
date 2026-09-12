"use client";

import React from "react";

interface HomeSectionProps {
  children: React.ReactNode;
  maxWidth?: "6xl" | "7xl";
  className?: string;
  id?: string;
  as?: "section" | "main";
}

/** Shared page-section shell: centered container with standard gutters. */
export function HomeSection({ children, maxWidth = "6xl", className = "", id, as = "section" }: HomeSectionProps) {
  const Tag = as;
  const widthClass = maxWidth === "7xl" ? "max-w-7xl" : "max-w-6xl";
  return (
    <Tag id={id} className={`mx-auto ${widthClass} px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </Tag>
  );
}

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  tone?: "solid" | "dashed";
}

/** Shared dark card shell for repeated section markup. */
export function Panel({ children, className = "", tone = "solid" }: PanelProps) {
  const border = tone === "dashed" ? "border-dashed border-white/[0.12]" : "border-white/[0.08]";
  return <div className={`rounded-xl border ${border} bg-[#141414] ${className}`}>{children}</div>;
}

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

/** Shared small mono section label row. */
export function Eyebrow({ children, className = "" }: EyebrowProps) {
  return <div className={`flex items-center gap-2 text-xs font-mono font-bold ${className}`}>{children}</div>;
}
