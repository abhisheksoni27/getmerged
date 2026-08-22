export interface Repo {
  id: number | string;
  full_name: string;
  owner?: string;
  name?: string;
  language: string;
  stars: number;
  description: string;
  url?: string;
  github_url?: string;
  star_bucket?: string;
  is_trending?: boolean;
  class_rank?: string;
  c_rank_tier?: string;
  score?: number;
  c_rank_score?: number;
  time_to_first_response_hours?: number;
  response_p50_hours?: number;
  response_p90_hours?: number;
  external_pr_merge_rate?: number;
  first_timer_success_rate?: number;
  time_to_merge_hours?: number;
  distinct_maintainer_count?: number;
  bus_factor?: number;
  staleness_flag?: boolean;
  good_first_issue_count?: number;
  pr_count_6m?: number;
  issue_count_6m?: number;
  onboarding_score?: number;
  newcomer_PR_merge_rate_90d_pct?: number | null;
  good_first_issue_count_open?: number;
  has_contributing_md?: boolean;
  updated_at?: string;
  snapshot_date?: string;
  topics?: string[];
  is_scored?: boolean;
}

export interface LanguageTierBreakdown {
  language: string;
  total: number;
  tier_map: Record<string, number>;
  avg_merge_rate?: number;
}

export interface MacroStats {
  total_repos: number;
  s_class_count?: number;
  languages_count?: number;
  avg_response_hours?: number;
  rank_counts?: Record<string, number>;
  bucket_counts?: Record<string, number>;
  top_language_counts?: Record<string, number>;
  language_breakdown?: LanguageTierBreakdown[];
  updated_ms?: number;
}

export interface AIInsights {
  repo_id: number | string;
  maintainer_vibe: string;
  pr_guidelines: string[];
  issue_quality_score: number;
  raw_summary: string;
  warmth_score?: number;
  patience_score?: number;
  nitpick_ratio?: number;
  maintainer_persona?: string;
  top_dos?: string[];
  top_donts?: string[];
  deep_sections?: { title: string; body: string }[];
}

export interface ContributorDNA {
  total_merged_prs: number;
  followers_count: number;
  repositories_count: number;
  language_breakdown: Record<string, number>;
  avg_additions: number;
  avg_deletions: number;
  avg_changed_files: number;
  primary_languages: string[];
  skill_level: string;
  pr_size_preference: string;
  review_engagement: string;
}

export interface User {
  id: number;
  github_id?: number | null;
  google_id?: string | null;
  slug?: string;
  username: string;
  email?: string;
  avatar_url?: string;
  profiling_consent?: boolean;
}

export interface UserStats {
  watchlist_count: number;
  feedback_count: number;
  verified_contributions: number | null;
}

export interface UserFeedbackItem {
  id: number;
  repo_id: string;
  repo_full_name: string;
  repo_language: string;
  maintainer_rating: number;
  review_speed_rating: number;
  beginner_rating: number;
  comment?: string;
  verified_contributor: boolean;
  created_at: string;
}

export interface UserProfile {
  slug: string;
  username: string;
  avatar_url?: string | null;
  member_since: string;
  github_url?: string | null;
  stats: UserStats;
  watchlist: Repo[];
  feedback: UserFeedbackItem[];
  dna?: ContributorDNA | null;
}

export interface GoodFirstIssueItem {
  id: number;
  repository_id: string;
  repo_full_name: string;
  language: string;
  stars: number;
  c_rank_tier: string;
  c_rank_score: number;
  issue_number: number;
  title: string;
  body_text?: string;
  url: string;
  comments_count: number;
  labels_json: string;
  quality_score?: number;
  created_at: string;
  synced_at: string;
}

export interface OptimalTimeResult {
  primary_start_hour_utc: number;
  primary_end_hour_utc: number;
  secondary_start_hour_utc?: number | null;
  secondary_end_hour_utc?: number | null;
  peak_hour_utc: number;
  active_maintainer_count: number;
  hourly_heatmap: number[];
  recommended_day_window: string;
  confidence_score: number;
}

export interface OptimalTimeResponse {
  repository: string;
  optimal_time: OptimalTimeResult;
}

export interface MatchRepo extends Repo {
  match_score?: number;
  reasons?: string[];
}

export interface TopicStat {  name: string;
  repo_count: number;
  avg_external_pr_merge_rate: number;
  avg_stars?: number;
  avg_response_hours?: number;
}


