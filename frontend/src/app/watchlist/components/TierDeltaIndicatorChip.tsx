"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Repo } from "@/types/opendoor";
import { TIER_RANKS, SnapshotHistoryItem } from "./watchlistTypes";

export interface TierDeltaProps {
  repo: Repo;
  history: SnapshotHistoryItem[];
}

export function TierDeltaIndicatorChip({ repo, history }: TierDeltaProps) {
  const currentTier = repo.c_rank_tier || repo.class_rank || "A";
  const repoSlug = (repo.full_name || `${repo.owner}/${repo.name}`).replace("/", "-");

  // Determine previous tier from history if available
  let prevTier: string | null = null;
  if (history && history.length >= 2) {
    prevTier = history[history.length - 2]?.c_rank_tier || null;
  } else if (history && history.length === 1) {
    prevTier = history[0]?.c_rank_tier || null;
  }

  const currentRank = TIER_RANKS[currentTier] ?? 3;
  const prevRank = prevTier ? (TIER_RANKS[prevTier] ?? currentRank) : currentRank;

  if (prevTier && currentRank > prevRank) {
    // Upward mobility
    return (
      <span
        data-testid={`tier-delta-chip-${repoSlug}`}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border-emerald-800/80 text-emerald-300 border border-emerald-200/90 font-mono text-xs font-semibold"
        title={`Tier improved from ${prevTier} to ${currentTier}`}
      >
        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
        <span>Tier {prevTier} → {currentTier} (Improved)</span>
        <span className="sr-only">Tier improved from {prevTier} to {currentTier}</span>
      </span>
    );
  }

  if (prevTier && currentRank < prevRank) {
    // Downward shift
    return (
      <span
        data-testid={`tier-delta-chip-${repoSlug}`}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200/90 font-mono text-xs font-semibold"
        title={`Tier shifted down from ${prevTier} to ${currentTier}`}
      >
        <TrendingDown className="h-3.5 w-3.5 text-red-700" />
        <span>Tier {prevTier} → {currentTier} (Shifted)</span>
        <span className="sr-only">Tier shifted from {prevTier} to {currentTier}</span>
      </span>
    );
  }

  // Neutral / stable state
  return (
    <span
      data-testid={`tier-delta-chip-${repoSlug}`}
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full glass-card text-zinc-300 border border-white/[0.1] font-mono text-xs font-medium"
      title={`Tier ${currentTier} stable (no recent changes)`}
    >
      <Minus className="h-3 w-3 text-zinc-300" />
      <span>Tier {currentTier} · Stable</span>
      <span className="sr-only">Tier unchanged ({currentTier})</span>
    </span>
  );
}
