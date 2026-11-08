"use client";

import React from "react";

interface HomeSectionProps {
  children: React.ReactNode;
  maxWidth?: "6xl" | "7xl";
  className?: string;
  id?: string;
  as?: "section" | "main";
}

/** Shared page-section shell: centered container with generous gutters. */
export function HomeSection({ children, maxWidth = "6xl", className = "", id, as = "section" }: HomeSectionProps) {
  const Tag = as;
  const widthClass = maxWidth === "7xl" ? "max-w-7xl" : "max-w-6xl";
  return (
    <Tag id={id} className={`mx-auto ${widthClass} px-4 sm:px-6 lg:px-8 py-10 sm:py-14 ${className}`}>
      {children}
    </Tag>
  );
}

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  tone?: "solid" | "dashed";
}

/** Dark DevEx Panel */
export function Panel({ children, className = "" }: PanelProps) {
  return (
    <div className={`card p-6 sm:p-8 ${className}`}>
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
    <div className={`hero-badge mb-3 ${className}`}>
      <span className="dot" />
      {children}
    </div>
  );
}
