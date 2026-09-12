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
        badgeClass: "bg-emerald-600 text-white border border-white/[0.12] font-bold shadow-sm",
        label: "Super Welcoming",
        indicatorColor: "bg-emerald-600",
      };
    case "A":
      return {
        badgeClass: "bg-blue-600 text-white border border-white/[0.12] font-bold shadow-sm",
        label: "Welcoming",
        indicatorColor: "bg-blue-600",
      };
    case "B":
      return {
        badgeClass: "bg-amber-600 text-white border border-white/[0.12] font-bold shadow-sm",
        label: "Moderate",
        indicatorColor: "bg-amber-600",
      };
    case "C":
      return {
        badgeClass: "bg-violet-600 text-white border border-white/[0.12] font-bold shadow-sm",
        label: "Slow Review",
        indicatorColor: "bg-purple-600",
      };
    case "D":
      return {
        badgeClass: "bg-rose-600 text-white border border-white/[0.12] font-bold shadow-sm",
        label: "Unmaintained",
        indicatorColor: "bg-rose-600",
      };
    default:
      return {
        badgeClass: "bg-black text-white border border-white/[0.12] font-bold shadow-sm",
        label: "Scored",
        indicatorColor: "bg-zinc-600",
      };
  }
}
