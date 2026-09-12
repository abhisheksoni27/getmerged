import React from "react";
import { ShieldCheck } from "lucide-react";
import { getBadgeStyle } from "./hacktoberfestTypes";

export function StatusPill({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-sans ${className}`}
    >
      {children}
    </span>
  );
}

export function TierPill({ tier }: { tier: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] ${getBadgeStyle(tier)}`}
    >
      {tier} Rank
    </span>
  );
}

export function WelcomingPill({ rate }: { rate: number }) {
  return (
    <StatusPill className="bg-emerald-950/80 border-emerald-800/80 border border-emerald-300 text-emerald-300">
      <ShieldCheck className="h-3 w-3 text-emerald-600" />
      Welcoming ({rate.toFixed(0)}%)
    </StatusPill>
  );
}
