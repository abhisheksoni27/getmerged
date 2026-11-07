"use client";

import React from "react";

interface HomeSectionProps {
  children: React.ReactNode;
  maxWidth?: "6xl" | "7xl";
  className?: string;
  id?: string;
  as?: "section" | "main";
}

/** Shared page-section shell: centered container with generous editorial gutters. */
export function HomeSection({ children, maxWidth = "6xl", className = "", id, as = "section" }: HomeSectionProps) {
  const Tag = as;
  const widthClass = maxWidth === "7xl" ? "max-w-7xl" : "max-w-6xl";
  return (
    <Tag id={id} className={`mx-auto ${widthClass} px-4 sm:px-6 lg:px-8 py-14 sm:py-20 ${className}`}>
      {children}
    </Tag>
  );
}

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  tone?: "solid" | "dashed";
}

/** Refined Panel with generous breathing room and clean border. */
export function Panel({ children, className = "", tone = "solid" }: PanelProps) {
  const border = tone === "dashed" ? "border-dashed border-zinc-300" : "border-zinc-200";
  return (
    <div className={`rounded-2xl border ${border} bg-white p-7 sm:p-10 shadow-xs ${className}`}>
      {children}
    </div>
  );
}

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

/** Subtle, elegant mono section badge. */
export function Eyebrow({ children, className = "" }: EyebrowProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-md px-2.5 py-1 mb-4 ${className}`}>
      {children}
    </div>
  );
}
