export interface AuditFactor {
  key: string;
  label: string;
  raw_value: number;
  normalized_score: number;
  peer_percentile: number;
  impact_level: "Critical" | "High" | "Moderate" | "Minor" | string;
  status: "Bottleneck" | "Needs Attention" | "Healthy" | "Exceptional" | string;
  simulated_uplift: number;
}

export interface PRFunnel {
  merge_rate: number;
  abandonment_rate: number;
  repeat_contributor_rate: number;
  first_timer_success_rate: number;
}

export interface ReviewerHealth {
  distinct_maintainers: number;
  bus_factor: number;
  avg_review_rounds: number;
  time_to_first_response_h: number;
  time_to_merge_h: number;
  concentration_risk: string;
}

export interface FrictionFingerprint {
  formatting_and_style_pct: number;
  missing_tests_and_ci_pct: number;
  scope_and_spec_pct: number;
}

export interface ActionableTemplates {
  pull_request_template: string;
  contributing_guide: string;
}

export interface DeepSection {
  title: string;
  body: string;
}

export interface AuditAIInsights {
  maintainer_vibe: string | null;
  maintainer_persona: string | null;
  warmth_score: number;
  patience_score: number;
  nitpick_ratio: number;
  top_dos: string[];
  top_donts: string[];
  deep_sections: DeepSection[];
}

export interface PrioritizedFix {
  priority: number;
  type: string;
  text?: string;
  title?: string;
}

export interface AuditReport {
  repo: {
    full_name: string;
    language: string | null;
    stars: number;
    description: string | null;
    c_rank_score: number;
    c_rank_tier: string;
  };
  overall: {
    score: number;
    tier: string;
    potential_uplift_pts?: number;
  };
  factors: AuditFactor[];
  pr_funnel?: PRFunnel;
  reviewer_health?: ReviewerHealth;
  friction_fingerprint?: FrictionFingerprint;
  actionable_templates?: ActionableTemplates;
  ai_insights: AuditAIInsights;
  prioritized_fixes: PrioritizedFix[];
}

export interface AnalysisStep {
  key: string;
  label: string;
  icon: string;
  durationMs: number;
  badge: string;
  description: string;
}
