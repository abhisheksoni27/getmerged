import { Repo } from "@/types/opendoor";

export interface SnapshotHistoryItem {
  snapshot_date: string;
  c_rank_score: number;
  c_rank_tier: string;
}

export interface WatchedRepoItem {
  repo: Repo;
  history: SnapshotHistoryItem[];
}

export interface WatchlistWebhook {
  id: number;
  label: string;
  url: string;
  enabled: boolean;
}

export const TIER_RANKS: Record<string, number> = {
  S: 5,
  A: 4,
  B: 3,
  C: 2,
  D: 1,
};

export function getBadgeStyle(rank?: string) {
  switch (rank) {
    case "S":
      return {
        badgeClass: "bg-emerald-50 text-[#0D9668] border border-emerald-200 font-bold shadow-xs",
        label: "Super Welcoming",
        indicatorColor: "bg-[#0D9668]",
      };
    case "A":
      return {
        badgeClass: "bg-sky-50 text-[#2D8ABF] border border-sky-200 font-bold shadow-xs",
        label: "Welcoming",
        indicatorColor: "bg-[#2D8ABF]",
      };
    case "B":
      return {
        badgeClass: "bg-purple-50 text-[#8B6BB5] border border-purple-200 font-bold shadow-xs",
        label: "Moderate",
        indicatorColor: "bg-[#8B6BB5]",
      };
    case "C":
      return {
        badgeClass: "bg-amber-50 text-[#C4910A] border border-amber-200 font-bold shadow-xs",
        label: "Slow Review",
        indicatorColor: "bg-[#C4910A]",
      };
    case "D":
      return {
        badgeClass: "bg-rose-50 text-[#C4463A] border border-rose-200 font-bold shadow-xs",
        label: "Unmaintained",
        indicatorColor: "bg-[#C4463A]",
      };
    default:
      return {
        badgeClass: "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-bold shadow-xs",
        label: "Scored",
        indicatorColor: "bg-[var(--text-muted)]",
      };
  }
}
