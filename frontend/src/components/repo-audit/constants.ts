import type { AnalysisStep } from "./types";

export const POLL_MS = 2000;
export const POLL_TIMEOUT_MS = 60000;

// The 10 analysis dimensions shown during the animated progress phase
export const ANALYSIS_STEPS: AnalysisStep[] = [
  { key: "pr_funnel", label: "PR Lifecycle Funnel", icon: "📊", durationMs: 900, badge: "Live", description: "Full 90-day PR journey: opened → reviewed → merged or abandoned. Exact drop-off at each stage." },
  { key: "first_timer", label: "First-Timer Journey", icon: "🌱", durationMs: 1100, badge: "Live", description: "Newcomer merge rate, ghost rate, and how many first-timers become repeat contributors." },
  { key: "reviewer_load", label: "Reviewer Load Distribution", icon: "⚖️", durationMs: 1300, badge: "Live", description: "Which reviewers carry 70%+ of the load? Early burnout warning before someone quietly disappears." },
  { key: "stale_prs", label: "Stale PR Graveyard", icon: "🕰️", durationMs: 800, badge: "Actionable", description: "Open PRs older than 30 days, each with a suggested action: merge it, close it, or just comment." },
  { key: "review_quality", label: "Review Comment Quality", icon: "🔬", durationMs: 1200, badge: "Live", description: "Nitpick vs blocking vs architectural ratio. Are reviews helping contributors or just slowing them down?" },
  { key: "retention", label: "Contributor Retention Curve", icon: "📈", durationMs: 1000, badge: "Live", description: "Month-over-month cohort view of who keeps contributing vs who ghosts after their first PR." },
  { key: "activity_patterns", label: "Activity Time Patterns", icon: "🗓️", durationMs: 700, badge: "Live", description: "Hour-of-day and day-of-week breakdown. When do PRs get reviewed fastest? Tell your contributors." },
  { key: "issue_conversion", label: "Issue-to-PR Conversion", icon: "🎯", durationMs: 900, badge: "Live", description: "Of your good-first-issues, how many actually get a PR? Identify which labels and titles convert." },
  { key: "velocity_trend", label: "Merge Velocity Trend", icon: "🚀", durationMs: 1100, badge: "Live", description: "Month-over-month merge rate. Is momentum building or quietly stalling? Catch it before it flatlines." },
  { key: "peer_benchmark", label: "Peer Ecosystem Benchmark", icon: "🏆", durationMs: 1400, badge: "Live", description: "All 9 C-Rank™ factors scored against 500+ peer repositories. Know exactly where you stand." },
];
