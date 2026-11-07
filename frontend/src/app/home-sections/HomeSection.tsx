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

/** Neo-Brutalist Panel: hard 2px black border with solid 4px black shadow. */
export function Panel({ children, className = "", tone = "solid" }: PanelProps) {
  const border = tone === "dashed" ? "border-2 border-dashed border-black" : "border-2 border-black";
  return (
    <div className={`rounded-none ${border} bg-white p-6 sm:p-8 shadow-[4px_4px_0px_0px_#000] ${className}`}>
      {children}
    </div>
  );
}

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

/** Shared mono section badge. */
export function Eyebrow({ children, className = "" }: EyebrowProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-mono font-black uppercase tracking-wider px-2 py-0.5 border-2 border-black bg-[#FACC15] text-black shadow-[2px_2px_0px_0px_#000] mb-3 ${className}`}>
      {children}
    </div>
  );
}
