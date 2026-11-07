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
    <Tag id={id} className={`mx-auto ${widthClass} px-4 sm:px-6 lg:px-8 py-16 sm:py-20 ${className}`}>
      {children}
    </Tag>
  );
}

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  tone?: "solid" | "dashed";
}

/** Shared clean white card shell for repeated section markup. */
export function Panel({ children, className = "", tone = "solid" }: PanelProps) {
  const border = tone === "dashed" ? "border-dashed border-[var(--border-strong)]" : "border-[var(--border-subtle)]";
  return (
    <div className={`rounded-2xl border ${border} bg-[var(--bg-surface)] p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${className}`}>
      {children}
    </div>
  );
}

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

/** Shared small mono section label row. */
export function Eyebrow({ children, className = "" }: EyebrowProps) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--text-secondary)] mb-2 ${className}`}>
      {children}
    </div>
  );
}
