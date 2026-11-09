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
  score_source?: "computed" | "fallback" | string;
  topics?: string[];
  is_scored?: boolean;
  low_sample?: boolean;
  currently_active?: boolean;
  last_activity_days?: number;
  access_status?: "open" | "vouch_required" | "collaborator_only" | "closed";
  access_status_reason?: string;
  ai_policy?: "allowed" | "disclosure_required" | "prohibited" | "unspecified";
  ai_policy_url?: string;
  ai_policy_reason?: string;
}

export interface LanguageTierBreakdown {
  language: string;
  total: number;
  tier_map: Record<string, number>;
  avg_merge_rate?: number;
  score?: number;
  welcoming_count?: number;
  rank?: number;
}

export interface MergedPRItem {
  pr_number: number;
  author_login: string;
  merger_login: string;
  turnaround_minutes: number;
  turnaround_str: string;
  merged_at: string;
  html_url: string;
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
  good_first_issue_count?: number;
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
  // Identity-card fields (2026-Q3). All optional so old stored payloads parse.
  persona?: string;
  persona_verdict?: string;
  persona_signals?: string[];
  temporal?: {
    peak_hour_utc: number;
    label: string;
  };
  stars_pulled_in?: number;
  top_repos?: {
    name_with_owner: string;
    stargazer_count: number;
    primary_language?: string | null;
  }[];
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
  is_pro?: boolean;
  billing_cycle?: string;
  subscription_expires_at?: string | null;
  has_recruiter_pass?: boolean;
  has_maintainer_sla?: boolean;
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
  is_bounty?: boolean;
  bounty_amount?: number | null;
  boosted?: boolean;
  has_linked_pr?: boolean;
  linked_pr_number?: number | null;
  is_verified_free?: boolean;
  verified_free_reason?: string | null;
  verified_free_checked_at?: string | null;
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

export interface MaintainerChecklistItem {
  id: string;
  title: string;
  description: string;
  impact_pts: number;
  category: string;
  fix_guidance: string;
  link_url: string;
  completed: boolean;
}

export interface MaintainerClaimDTO {
  id: number;
  repo_id: string;
  owner_user_id: number;
  verification_method: "file" | "org" | "direct" | string;
  state: "pending" | "verified" | "revoked" | string;
  verified_at?: string | null;
  last_checked_at?: string | null;
  expires_at: string;
}

export interface MaintainerConsolePayload {
  repo_full_name: string;
  is_claimed: boolean;
  is_verified: boolean;
  claim?: MaintainerClaimDTO;
  c_rank_score: number;
  c_rank_tier: string;
  breakdown: {
    external_pr_merge_rate: number;
    time_to_first_response_hours: number;
    response_p50_hours: number;
    response_p90_hours: number;
    time_to_merge_hours: number;
    first_timer_success_rate: number;
    repeat_contributor_rate: number;
    maintainer_responsiveness: number;
    distinct_maintainer_count: number;
    bus_factor: number;
    good_first_issue_count: number;
    onboarding_score: number;
  };
  checklist: MaintainerChecklistItem[];
}

export interface ClaimInitiateResponse {
  claim_id: number;
  repo_id: string;
  full_name: string;
  state: string;
  verification_method: string;
  nonce_token?: string;
  file_instructions?: {
    file_name: string;
    file_content: string;
    nonce: string;
    commit_guidance: string;
  };
  org_verified?: boolean;
  expires_at: string;
}

export interface RankGapItem {
  id: string;
  title: string;
  status: "insufficient_data" | "gap" | "ok" | string;
  gap: string;
  impact_pts: number;
  fix_guidance?: string;
}

export interface RepoPlaybookPayload {
  repo_full_name: string;
  is_scored: boolean;
  c_rank_score: number;
  c_rank_tier: string;
  score_version: string;
  valid_metrics: number;
  locked?: boolean;
  checklist: RankGapItem[];
}

export interface RescoreResult {
  before_score: number;
  after_score: number;
  before_tier: string;
  after_tier: string;
  outcome: "improved" | "no_change" | "regressed" | string;
  card_issued: boolean;
  card_status: string;
  rate_limited: boolean;
  next_allowed_at?: string;
  card_url?: string;
  card_expires_at?: string;
  status?: string;
}

export interface PRSizeBucket {
  label: string;
  line_range: string;
  median_merge_hours: number;
  merge_rate: number;
  review_likelihood: string;
}

export interface PRSizeSweetSpotData {
  sweet_spot_threshold: string;
  speed_multiplier: number;
  actionable_advice: string;
  small_pr: PRSizeBucket;
  medium_pr: PRSizeBucket;
  large_pr: PRSizeBucket;
}


