"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { tierBadgeClass } from "./validation";

interface ErrorBannerProps {
  message: string | null;
  conflict: boolean;
  disputing: boolean;
  onDispute: () => void;
}

export function ErrorBanner({ message, conflict, disputing, onDispute }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex items-start gap-3 text-red-900 text-sm font-medium">
      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        {message}
        {conflict && (
          <div className="mt-3 pt-3 border-t border-red-200 text-xs text-zinc-300">
            Think you are the rightful maintainer?{" "}
            <button
              onClick={onDispute}
              disabled={disputing}
              className="font-bold text-red-700 hover:text-red-800 underline underline-offset-2 cursor-pointer disabled:opacity-50"
            >
              {disputing ? "Submitting..." : "Report a dispute"}
            </button>{" "}
            for admin review - ownership is never transferred automatically.
          </div>
        )}
      </div>
    </div>
  );
}

interface TierBadgeProps {
  tier: string;
}

export function TierBadge({ tier }: TierBadgeProps) {
  return (
    <span
      className={`ml-2 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono border text-white ${tierBadgeClass(tier)}`}
    >
      Tier {tier}
    </span>
  );
}

interface MetricTileProps {
  label: string;
  value: string | number;
}

export function MetricTile({ label, value }: MetricTileProps) {
  return (
    <div className="p-3 glass-card border border-white/[0.1] rounded-xl">
      <span className="text-zinc-300 block text-[10px] uppercase">{label}</span>
      <span className="font-bold text-white text-sm">{value}</span>
    </div>
  );
}
