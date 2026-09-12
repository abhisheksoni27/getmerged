"use client";

import React from "react";

interface DashboardCardProps {
  as?: "div" | "li";
  className?: string;
  children: React.ReactNode;
}

// Shared panel shell for dashboard cards (PR rows and content panels).
export function DashboardCard({ as = "div", className = "", children }: DashboardCardProps) {
  const cls = `rounded-xl border border-white/[0.1] glass-panel p-4 shadow-sm/5${
    className ? ` ${className}` : ""
  }`;
  if (as === "li") return <li className={cls}>{children}</li>;
  return <div className={cls}>{children}</div>;
}

// Shared empty state for dashboard panels with no data.
export function DashboardEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.12] p-10 text-center text-sm text-zinc-300">
      {children}
    </div>
  );
}
