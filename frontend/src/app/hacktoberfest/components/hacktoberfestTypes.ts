export interface LeaderboardRepo {
  id: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stars: number;
  c_rank_tier: string;
  c_rank_score: number;
  gfi_quality_score: number;
  gfi_count: number;
  first_timer_success_rate: number;
  welcome_badge: boolean;
}

export interface StoredMerge {
  pr_id: string;
  repository_id: string;
  pr_number: number;
  title: string;
  html_url: string;
  merged_at: string | null;
}

export interface ProgressResponse {
  year: number;
  target: number;
  merged_count: number;
  total_qualifying: number;
  card_issued: boolean;
  last_checked_at: string | null;
  cached: boolean;
  limited: boolean;
  reconnect_required: boolean;
  connection: string;
  card: {
    card_id: string;
    share_url: string;
    og_image_url: string;
  } | null;
  merges: StoredMerge[];
  updated_ago_min?: number;
  retry_after_sec?: number;
}

export type EventPhase = "pre" | "live" | "post";

export const EVENT_YEAR = 2026;
export const EVENT_START = new Date("2026-10-01T00:00:00Z").getTime();
export const EVENT_END = new Date("2026-11-01T00:00:00Z").getTime();

export function getEventPhase(now: number = Date.now()): EventPhase {
  if (now < EVENT_START) return "pre";
  if (now >= EVENT_END) return "post";
  return "live";
}

export function getBadgeStyle(tier: string) {
  switch (tier?.toUpperCase()) {
    case "S":
      return "bg-emerald-600 text-white border border-white/[0.1] font-bold";
    case "A":
      return "bg-blue-600 text-white border border-white/[0.1] font-bold";
    case "B":
      return "bg-amber-600 text-white border border-white/[0.1] font-bold";
    default:
      return "glass-card text-zinc-200 border border-white/[0.12]";
  }
}
