import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  GitMerge,
  Clock,
  Activity,
  ShieldCheck,
  Zap,
  Users,
  Repeat,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "How C-Rank™ Works - Scoring Formula & Telemetry - Opendoor",
  description: "Explore the exact 9-factor mathematical telemetry formula and weighting coefficients behind the C-Rank open-source repository scoring index.",
  alternates: {
    canonical: "https://opendoor.abhishekco.de/how-c-rank-works",
  },
  openGraph: {
    title: "How C-Rank™ Works - Opendoor Telemetry Index",
    description: "Learn how we calculate objective PR merge rates, reviewer response latency, and first-timer success metrics from raw GitHub GraphQL data.",
    url: "https://opendoor.abhishekco.de/how-c-rank-works",
    siteName: "Opendoor",
  },
};

export default function HowCRankWorksPage() {
  const coefficients = [
    {
      name: "External PR Merge Rate",
      weight: "27.5%",
      weightDecimal: 0.275,
      icon: GitMerge,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      headline: "The Core Filter: Are External Submissions Merged?",
      desc: "Measures the exact percentage of community (non-maintainer) pull requests merged into the default branch. Excludes internal bot updates and maintainer-authored branches.",
      formula: "PercentileRank(ExternalMergedPRs / TotalExternalPRs)",
    },
    {
      name: "Time to First Response",
      weight: "15.0%",
      weightDecimal: 0.15,
      icon: Clock,
      color: "text-blue-700 bg-blue-50 border-blue-200",
      headline: "Review Velocity: How Long Until a Human Replies?",
      desc: "Calculates the median hours elapsed between a contributor opening a PR and a maintainer posting a review or inline comment. Sub-24-hour turnaround scores highest.",
      formula: "InvertedPercentileRank(MedianHoursToFirstComment)",
    },
    {
      name: "Activity Recency & Decay",
      weight: "15.0%",
      weightDecimal: 0.15,
      icon: Activity,
      color: "text-purple-700 bg-purple-50 border-purple-200",
      headline: "Freshness Decay: When Was the Last Commit Merged?",
      desc: "Scores repository pulse over a 180-day window. Projects with active commits within 7 days receive 100 points, decaying to 0 if inactive beyond 180 days.",
      formula: "TieredDecay: <=7d (100pt), <=30d (80pt), <=60d (60pt), >180d (0pt)",
    },
    {
      name: "First-Timer Success Rate",
      weight: "10.0%",
      weightDecimal: 0.10,
      icon: ShieldCheck,
      color: "text-amber-700 bg-amber-50 border-amber-200",
      headline: "Beginner Hospitality: Do First-Time Authors Succeed?",
      desc: "Specifically evaluates authors submitting their very first pull request to the repository. Differentiates inclusive communities from gatekept codebases.",
      formula: "PercentileRank(FirstTimerMerged / TotalFirstTimerPRs)",
    },
    {
      name: "Time to Merge (Resolution)",
      weight: "10.0%",
      weightDecimal: 0.10,
      icon: Zap,
      color: "text-indigo-700 bg-indigo-50 border-indigo-200",
      headline: "Resolution Speed: How Quickly Are PRs Landed?",
      desc: "Tracks the total duration in hours from PR creation to final squash or merge commit. Low resolution latency prevents endless rebasing cycles.",
      formula: "InvertedPercentileRank(MedianHoursToMerge)",
    },
    {
      name: "Repeat Contributor Rate",
      weight: "10.0%",
      weightDecimal: 0.10,
      icon: Repeat,
      color: "text-cyan-700 bg-cyan-50 border-cyan-200",
      headline: "Contributor Retention: Do Developers Return?",
      desc: "Measures the ratio of outside contributors who submit 2 or more merged pull requests. High repeat rates prove a healthy and encouraging maintainer culture.",
      formula: "PercentileRank(RepeatContributors / UniqueContributors)",
    },
    {
      name: "Review Rounds & Friction",
      weight: "5.0%",
      weightDecimal: 0.05,
      icon: HelpCircle,
      color: "text-orange-700 bg-orange-50 border-orange-200",
      headline: "Nitpick Factor: How Many Review Cycles Are Required?",
      desc: "Analyzes maintainer comment density per merged PR. Optimal range is 1-3 constructive comments; >6 cycles triggers friction penalties.",
      formula: "100 - PercentileRank(AverageReviewRoundsPerPR)",
    },
    {
      name: "Maintainer Core Breadth",
      weight: "5.0%",
      weightDecimal: 0.05,
      icon: Users,
      color: "text-rose-700 bg-rose-50 border-rose-200",
      headline: "Bus Factor: Is Review Distributed or Bottlenecked?",
      desc: "Counts distinct maintainers actively conducting code reviews. Projects with 5+ active reviewers avoid single-point maintainer burnout.",
      formula: "Scale: >=5 maintainers (100pt), 3 maintainers (70pt), 1 (30pt)",
    },
    {
      name: "Maintainer Responsiveness",
      weight: "2.5%",
      weightDecimal: 0.025,
      icon: Sparkles,
      color: "text-emerald-800 bg-emerald-50 border-emerald-200",
      headline: "Issue & Discussion Triage",
      desc: "Tracks turnaround time on new issues and discussions to evaluate overall repository maintenance dedication.",
      formula: "InvertedPercentileRank(IssueTriageHours)",
    },
  ];

  const tiers = [
    {
      tier: "S",
      label: "Super Welcoming",
      range: "70.0 - 100.0 pts",
      badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-300",
      indicatorColor: "bg-emerald-500",
      desc: "Top-tier contributor ecosystems. Pull requests receive review within 24 hours, first-time authors are actively mentored, and merge rates exceed 80%.",
    },
    {
      tier: "A",
      label: "Welcoming",
      range: "55.0 - 69.9 pts",
      badgeClass: "bg-blue-50 text-blue-900 border-blue-200",
      indicatorColor: "bg-blue-500",
      desc: "Solid, dependable repositories with active maintainer turnaround. Consistent PR reviews and welcoming review etiquette.",
    },
    {
      tier: "B",
      label: "Moderate",
      range: "40.0 - 54.9 pts",
      badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
      indicatorColor: "bg-amber-500",
      desc: "Maintainers are active but may experience review bottlenecks during release cycles. PRs are reviewed within 3-7 days.",
    },
    {
      tier: "C",
      label: "Slow Review",
      range: "25.0 - 39.9 pts",
      badgeClass: "bg-purple-50 text-purple-900 border-purple-200",
      indicatorColor: "bg-purple-500",
      desc: "Selective code acceptance or lengthy review queues. Best suited for experienced contributors who can handle longer review wait times.",
    },
    {
      tier: "D",
      label: "Unmaintained",
      range: "0.0 - 24.9 pts",
      badgeClass: "bg-rose-50 text-rose-900 border-rose-200",
      indicatorColor: "bg-rose-500",
      desc: "Stale repositories or abandoned backlogs. Community pull requests frequently sit unreviewed for months.",
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6] dev-grid-pattern">
      <Header />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full font-sans text-zinc-800">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          title="Return to Opendoor Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-600 hover:text-zinc-900 transition-colors mb-8 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Narrative Section */}
        <div className="rounded-3xl bg-white p-8 sm:p-12 border border-zinc-200/80 shadow-xs mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-900 text-white font-mono text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" /> C-Rank™ Mathematical Index
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-space text-zinc-900 tracking-tight leading-tight">
            How Opendoor Calculates Repository Welcoming Scores
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 max-w-3xl leading-relaxed font-sans">
            GitHub star counts measure past popularity, not present hospitality. Opendoor queries raw GitHub GraphQL event streams to compute an objective 0 to 100 index based on real maintainer velocity, review latency, and first-timer conversion rates.
          </p>
        </div>

        {/* Master Formula Callout */}
        <div className="rounded-3xl bg-zinc-900 text-white p-8 sm:p-10 shadow-sm mb-12 font-mono">
          <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">
            The C-Rank™ Master Equation
          </div>
          <div className="text-sm sm:text-base leading-relaxed bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-zinc-200 overflow-x-auto">
            <code>
              C-Rank = (0.275 × MergeRate) + (0.15 × ResponseTime) + (0.15 × Recency) + (0.10 × FirstTimer) + (0.10 × TimeToMerge) + (0.10 × Retention) + (0.05 × ReviewRounds) + (0.05 × Maintainers) + (0.025 × Responsiveness)
            </code>
          </div>
          <div className="mt-4 text-xs text-zinc-400 font-sans leading-relaxed">
            All variables are normalized against ecosystem peers using percentile rank transformations before coefficient multiplication.
          </div>
        </div>

        {/* 9 Scoring Factors Breakdown */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-zinc-200 pb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold font-space text-zinc-900">
              The 9 Weighting Coefficients
            </h2>
            <span className="text-xs font-mono text-zinc-500">Sum = 100.0%</span>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {coefficients.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="rounded-2xl bg-white p-6 sm:p-7 border border-zinc-200/80 shadow-xs hover:border-zinc-300 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-5"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-zinc-400">0{idx + 1}</span>
                        <h3 className="font-space text-lg font-bold text-zinc-900">
                          {item.name}
                        </h3>
                      </div>
                      <p className="text-sm font-semibold text-zinc-800 font-sans mb-1.5">
                        {item.headline}
                      </p>
                      <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-sans mb-3">
                        {item.desc}
                      </p>
                      <div className="inline-block px-3 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-600 font-mono text-xs">
                        <code>{item.formula}</code>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 font-mono pl-15 sm:pl-0">
                    <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Weight</div>
                    <div className="text-2xl font-bold text-zinc-900">{item.weight}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modifiers & Haircuts Section */}
        <div className="rounded-3xl bg-white p-8 sm:p-10 border border-zinc-200/80 shadow-xs mb-16 space-y-6">
          <h2 className="text-2xl font-bold font-space text-zinc-900">
            Score Adjustments, Boosts & Staleness Caps
          </h2>
          <p className="text-sm text-zinc-600 font-sans leading-relaxed">
            In addition to baseline metrics, our scoring engine applies automated modifiers to reflect real-world maintainer intent:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 font-sans text-xs">
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="font-bold text-emerald-950 font-space text-base">+15% Good First Issue Boost</div>
              <p className="text-emerald-900 leading-relaxed">
                Repositories with active labeled beginner issues receive a 15% score multiplier (capped at 100 pts) to reward proactive contributor onboarding.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="font-bold text-amber-950 font-space text-base">-10% First-Timer Penalty</div>
              <p className="text-amber-900 leading-relaxed">
                If a repository has zero good first issues and its first-timer acceptance rate is below 50%, a 10% haircut is applied for low beginner hospitality.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
              <div className="font-bold text-rose-950 font-space text-base">Staleness Hard-Cap (Max 29.9)</div>
              <p className="text-rose-900 leading-relaxed">
                Repositories with no commits or merged PRs in 180+ days are automatically capped at 29.9 points and assigned D-Tier (Unmaintained).
              </p>
            </div>
          </div>
        </div>

        {/* Tier Hierarchy */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-zinc-200 pb-4">
            <h2 className="text-2xl font-bold font-space text-zinc-900">
              Tier Classification Hierarchy (S to D)
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 font-sans mt-1">
              How numerical scores map to contributor hospitality tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tiers.map((t) => (
              <div
                key={t.tier}
                className="rounded-2xl bg-white p-6 border border-zinc-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-4 flex-1">
                  <div className={`px-3 py-1.5 rounded-xl font-mono text-sm font-bold border shrink-0 flex items-center gap-2 ${t.badgeClass}`}>
                    <span className={`h-2 w-2 rounded-full ${t.indicatorColor}`} />
                    <span>{t.label} ({t.tier})</span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-600 font-sans leading-relaxed">
                    {t.desc}
                  </p>
                </div>
                <div className="font-mono text-xs font-bold text-zinc-700 bg-zinc-100 px-3 py-1 rounded-lg shrink-0 sm:text-right">
                  {t.range}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-3xl bg-zinc-900 text-white p-8 sm:p-12 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold font-space">
              Ready to find welcoming repositories?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 font-sans">
              Search over 40,000+ indexed repositories scored with our telemetry engine.
            </p>
          </div>
          <Link
            href="/"
            title="Explore Open Source Repositories on Opendoor"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-sans text-xs font-bold text-zinc-900 hover:bg-zinc-100 active:scale-95 transition-all shadow-xs shrink-0"
          >
            <span>Explore Repositories</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
