import type { PREvalOutcome } from "@/lib/pr-verdict";

export interface Benchmark {
  response_p50_hours: number | null;
  response_p90_hours: number | null;
  median_time_to_merge_hours: number | null;
}

export interface Forecast {
  label: string;
  score: number;
  reasons: string[];
  basis: string;
}

export interface TrackedPR {
  pr_id: string;
  repository_id: string;
  full_name: string;
  c_rank_tier: string;
  pr_number: number;
  title: string;
  html_url: string;
  state: "open" | "changes_requested" | "approved" | "merged" | "closed";
  pr_created_at: string | null;
  github_updated_at: string | null;
  fetched_at: string;
  age_hours: number;
  stale: boolean;
  benchmark: Benchmark | null;
  forecast?: Forecast | null;
  forecast_locked: boolean;
  outcome?: PREvalOutcome | null;
}

export interface Connection {
  status: "active" | "reconnect_required";
  github_login: string;
  last_synced_at: string | null;
  limited: boolean;
}

export interface MeInfo {
  slug?: string | null;
  username?: string;
  is_public?: boolean;
}

export interface DashboardData {
  prs: TrackedPR[];
  generated_at: string;
  stale_after_min: number;
  connection: Connection;
  is_pro: boolean;
}
