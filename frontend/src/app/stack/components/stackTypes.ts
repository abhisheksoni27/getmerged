export interface StackIssue {
  id: number;
  title: string;
  url: string;
  comments: number;
  created_at: string;
}

export interface StackRepoInfo {
  package_name: string;
  repo_full_name?: string;
  c_rank_tier: string;
  external_pr_merge_rate: number;
  time_to_first_response_hours: number;
  bus_factor: number;
  is_stale: boolean;
  good_first_issues_count: number;
  good_first_issues?: StackIssue[];
  maintainer_status: "welcoming" | "active" | "fragile" | "abandoned" | "unknown";
}

export interface StackSummary {
  total_dependencies: number;
  indexed_dependencies: number;
  healthy_count: number;
  moderate_count: number;
  at_risk_count: number;
  total_good_first_issues: number;
  overall_health_grade: string;
  health_score_percentage: number;
}

export interface StackAnalysisResult {
  repo_full_name?: string;
  manifest_type: string;
  summary: StackSummary;
  dependencies: StackRepoInfo[];
}

export interface UserRepoItem {
  full_name: string;
  name: string;
  description?: string;
  language?: string;
  stars: number;
  is_private: boolean;
  default_branch: string;
}

export interface FlattenedIssue extends StackIssue {
  repo: string;
  tier: string;
  merge_rate: number;
  packageName: string;
}

// Pure transform: flatten per-dependency good-first-issues into a single list.
export function flattenIssues(dependencies: StackRepoInfo[]): FlattenedIssue[] {
  return (dependencies || []).flatMap((d) =>
    (d.good_first_issues || []).map((issue) => ({
      ...issue,
      repo: d.repo_full_name || d.package_name,
      tier: d.c_rank_tier,
      merge_rate: d.external_pr_merge_rate,
      packageName: d.package_name,
    }))
  );
}

export function healthGradeStyle(grade: string): string {
  if (grade === "S" || grade === "A") {
    return "bg-emerald-500/20 border border-emerald-500 text-emerald-400";
  }
  if (grade === "B") {
    return "bg-amber-500/20 border border-amber-500 text-amber-400";
  }
  return "bg-red-500/20 border border-red-500 text-red-400";
}

export function tierBadgeStyle(tier: string): string {
  if (tier === "S" || tier === "A") {
    return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
  }
  if (tier === "B") {
    return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
  }
  if (tier === "C" || tier === "D") {
    return "bg-red-500/20 text-red-400 border border-red-500/30";
  }
  return "bg-zinc-800 text-zinc-400";
}
