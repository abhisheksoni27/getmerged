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
  external_pr_merge_rate?: number;
  first_timer_success_rate?: number;
  time_to_merge_hours?: number;
  distinct_maintainer_count?: number;
  staleness_flag?: boolean;
  good_first_issue_count?: number;
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
}

export interface User {
  id: number;
  github_id: number;
  username: string;
  email?: string;
  avatar_url?: string;
}
