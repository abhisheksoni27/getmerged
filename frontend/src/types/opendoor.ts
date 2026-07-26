export interface Repo {
  id: number;
  full_name: string;
  owner: string;
  name: string;
  language: string;
  stars: number;
  description: string;
  url: string;
  star_bucket: string;
  is_trending?: boolean;
  class_rank?: string;
  score?: number;
}

export interface MacroStats {
  total_repos: number;
  rank_counts: Record<string, number>;
  bucket_counts: Record<string, number>;
  top_language_counts: Record<string, number>;
  updated_ms: number;
}

export interface AIInsights {
  repo_id: number;
  maintainer_vibe: string;
  pr_guidelines: string[];
  issue_quality_score: number;
  raw_summary: string;
}

export interface User {
  id: number;
  github_id: number;
  username: string;
  email?: string;
  avatar_url?: string;
}
