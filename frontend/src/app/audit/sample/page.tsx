import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, FileSearch } from "lucide-react";
import { AuditReport, AuditReportContent } from "@/components/RepoAuditReport";

export const metadata: Metadata = {
  title: "Live Sample Deep-Audit Report: facebook/react | GetMerged",
  description:
    "Explore a full interactive sample of the GetMerged $19 Deep-Audit diagnostic report. See PR drop-off funnels, ecosystem benchmarking, reviewer burnout metrics, and AI-prioritized fixes.",
};

const sampleReactReport: AuditReport = {
  repo: {
    full_name: "facebook/react",
    language: "JavaScript",
    stars: 228000,
    description: "The library for web and native user interfaces.",
    c_rank_score: 84.6,
    c_rank_tier: "A",
  },
  overall: {
    score: 84.6,
    tier: "A",
    potential_uplift_pts: 6.8,
  },
  pr_funnel: {
    merge_rate: 38.4,
    abandonment_rate: 61.6,
    repeat_contributor_rate: 22.8,
    first_timer_success_rate: 19.5,
  },
  reviewer_health: {
    distinct_maintainers: 14,
    bus_factor: 4,
    avg_review_rounds: 3.2,
    time_to_first_response_h: 18.4,
    time_to_merge_h: 94.2,
    concentration_risk: "Moderate - Concentrated Core Team",
  },
  friction_fingerprint: {
    formatting_and_style_pct: 35,
    missing_tests_and_ci_pct: 42,
    scope_and_spec_pct: 23,
  },
  factors: [
    {
      key: "merge_rate",
      label: "Outside PR Merge Rate",
      raw_value: 38.4,
      normalized_score: 72.0,
      peer_percentile: 68,
      impact_level: "Critical",
      status: "Healthy",
      simulated_uplift: 1.8,
    },
    {
      key: "response_time",
      label: "First Response Turnaround",
      raw_value: 18.4,
      normalized_score: 81.0,
      peer_percentile: 79,
      impact_level: "Critical",
      status: "Healthy",
      simulated_uplift: 0,
    },
    {
      key: "activity_recency",
      label: "Activity Recency",
      raw_value: 0.5,
      normalized_score: 98.0,
      peer_percentile: 99,
      impact_level: "Critical",
      status: "Exceptional",
      simulated_uplift: 0,
    },
    {
      key: "first_timer",
      label: "First-Timer Success Rate",
      raw_value: 19.5,
      normalized_score: 48.0,
      peer_percentile: 42,
      impact_level: "High",
      status: "Needs Attention",
      simulated_uplift: 2.3,
    },
    {
      key: "time_to_merge",
      label: "Time to Merge",
      raw_value: 94.2,
      normalized_score: 64.0,
      peer_percentile: 58,
      impact_level: "High",
      status: "Healthy",
      simulated_uplift: 1.2,
    },
    {
      key: "repeat_contributor",
      label: "Repeat Contributor Retention",
      raw_value: 22.8,
      normalized_score: 69.0,
      peer_percentile: 65,
      impact_level: "High",
      status: "Healthy",
      simulated_uplift: 0.9,
    },
    {
      key: "review_rounds",
      label: "Review Rounds per Merged PR",
      raw_value: 3.2,
      normalized_score: 55.0,
      peer_percentile: 49,
      impact_level: "Moderate",
      status: "Needs Attention",
      simulated_uplift: 0.6,
    },
    {
      key: "maintainer_breadth",
      label: "Distinct Maintainer Count",
      raw_value: 14.0,
      normalized_score: 92.0,
      peer_percentile: 94,
      impact_level: "Moderate",
      status: "Exceptional",
      simulated_uplift: 0,
    },
    {
      key: "responsiveness",
      label: "Maintainer Responsiveness Score",
      raw_value: 86.0,
      normalized_score: 86.0,
      peer_percentile: 88,
      impact_level: "Minor",
      status: "Exceptional",
      simulated_uplift: 0,
    },
  ],
  ai_insights: {
    maintainer_vibe: "Rigorous, architecture-focused, and deliberate.",
    maintainer_persona: "Principal Systems Architect",
    warmth_score: 74.0,
    patience_score: 68.0,
    nitpick_ratio: 0.42,
    top_dos: [
      "Open an RFC or discussion before modifying core reconciler internals.",
      "Include explicit automated regression tests covering React concurrent mode edge cases.",
      "Verify code footprint and bundle-size impact in your PR description.",
    ],
    top_donts: [
      "Don't submit large cosmetic code refactors across shared package directories.",
      "Don't submit PRs with breaking public API changes without prior core-team sign-off.",
      "Don't bypass CI checks or submit untested changes to scheduler primitives.",
    ],
    deep_sections: [
      {
        title: "Reconciler & Fiber Architectural Gates",
        body: "PRs touching ReactFiber or scheduler packages require 2 core maintainer approvals. Contributors should link related GitHub issues and include benchmarks.",
      },
    ],
  },
  prioritized_fixes: [
    {
      priority: 1,
      type: "avoid",
      text: "Avoid uncoordinated cosmetic refactors across internal package boundaries - 42% of closed unmerged PRs cited scope friction.",
    },
    {
      priority: 2,
      type: "theme",
      title: "Introduce Strict PR Template Checklist",
      text: "Add required bundle size and concurrent mode regression test checkboxes to .github/pull_request_template.md to cut review iterations from 3.2 → 1.8.",
    },
    {
      priority: 3,
      type: "avoid",
      text: "Avoid submitting PRs with failing unit tests or missing fixture updates.",
    },
  ],
  actionable_templates: {
    pull_request_template: `### Summary
<!-- What does this PR do and why is it needed? -->

### Related Issues
- Closes #

### Validation & Regression Tests
- [ ] Added automated test cases for concurrent and synchronous rendering
- [ ] Ran \`yarn test\` and \`yarn flow\` with 0 errors
- [ ] Verified bundle-size delta via fixture build

### Contributor Checklist
- [ ] Follows React repository code style
- [ ] No unsolicited cross-package formatting changes
`,
    contributing_guide: `## Review Process & Turnaround SLA

- **First Response Time**: The core team reviews outside pull requests in ~18-24 hours.
- **Scope Policy**: Keep pull requests minimal and focused on a single bug or feature.
- **Architectural Changes**: Please discuss significant architectural proposals in Discussions or RFCs before submitting code.
`,
  },
};

export default function SampleAuditPage() {
  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-transparent overflow-x-hidden">
      {/* Sample Demo Banner */}
      <div className="bg-gradient-to-r from-amber-950/90 via-amber-900/80 to-zinc-950 border-b border-amber-500/30 px-4 py-3 text-center sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap text-xs font-mono">
          <div className="flex items-center gap-2 text-amber-200">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="font-bold">Live Interactive Sample Report (facebook/react)</span>
            <span className="hidden sm:inline text-amber-400/80"> - See what a $19 Deep-Audit delivers</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 px-3 py-1 rounded-full text-[11px] font-bold transition-all"
            >
              <FileSearch className="h-3.5 w-3.5" />
              Audit Your Repo
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            title="Back to home"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to GetMerged
          </Link>
          <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-white/[0.1] px-2.5 py-1 rounded-md">
            Interactive Demo Mode
          </span>
        </div>

        <AuditReportContent report={sampleReactReport} />
      </main>
    </div>
  );
}
