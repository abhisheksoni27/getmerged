import React from "react";
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
  Repeat,
  HelpCircle,
  Users,
  Sparkles,
  DoorOpen,
  HeartCrack,
  Ghost,
  ExternalLink,
  Code2,
  Calculator,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "How GetMerged Scores Repositories - C-Rank™ Methodology",
  description:
    "The exact math behind C-Rank™: 9 signals, weighted sum, Bayesian shrinkage, tier thresholds, staleness rules, and the open-source scoring module.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/how-c-rank-works",
  },
  openGraph: {
    title: "How GetMerged Scores Repositories - C-Rank™ Methodology",
    description:
      "Every number, weight, and threshold that powers C-Rank™. Open-source, auditable, and explained in plain English.",
    url: "https://getmerged.abhishekco.de/how-c-rank-works",
    siteName: "GetMerged",
  },
};

export default function HowCRankWorksPage() {
  const signals = [
    {
      name: "External PR Merge Rate",
      weight: "22.5%",
      icon: GitMerge,
      color: "text-emerald-400 bg-emerald-950/60 border-emerald-500/30",
      what: "Ratio of merged vs. closed outside-community PRs. Excludes automated dependency bots and internal branch merges.",
      how: "Percentile rank across all 102k repos. A repo merging 60% of external PRs scores higher than one merging 20%.",
      window: "180-day rolling",
    },
    {
      name: "Reviewer Response Turnaround",
      weight: "12.5%",
      icon: Clock,
      color: "text-blue-400 bg-blue-950/60 border-blue-500/30",
      what: "Median hours before a human maintainer posts an actionable review on an external PR.",
      how: "Lower is better. If there are enough peers, it's an inverted percentile rank. If the repo is lonely, it falls back to absolute benchmarks: ≤12h = 100, ≤24h = 80, ≤72h = 60, ≤168h = 40, >168h = 20.",
      window: "Recent PRs",
    },
    {
      name: "Maintainer Activity Recency",
      weight: "12.5%",
      icon: Activity,
      color: "text-purple-400 bg-purple-950/60 border-purple-500/30",
      what: "Days since the last merged external PR. If a maintainer hasn't merged anything in 6 months, that's a red flag.",
      how: "Absolute benchmark, no percentile needed: ≤7 days = 100, ≤30 = 80, ≤60 = 60, ≤90 = 40, ≤180 = 20, >180 = 0.",
      window: "180-day lookback",
    },
    {
      name: "First-Timer Contributor Success",
      weight: "10.0%",
      icon: ShieldCheck,
      color: "text-amber-400 bg-amber-950/60 border-amber-500/30",
      what: "Percentage of first-time external contributors whose PR gets merged. Not just opened - merged.",
      how: "Percentile rank. We detect first-timers via GitHub's FIRST_TIME_CONTRIBUTOR association OR anyone submitting their very first PR to that repo.",
      window: "180-day rolling",
    },
    {
      name: "Time to Merge",
      weight: "10.0%",
      icon: Zap,
      color: "text-indigo-400 bg-indigo-950/60 border-indigo-500/30",
      what: "Median hours from PR open to final merge. Fast turnaround without endless rebasing cycles.",
      how: "Lower is better. Inverted percentile rank when peers exist, absolute benchmark fallback when lonely.",
      window: "Merged PRs only",
    },
    {
      name: "Repeat Contributor Rate",
      weight: "10.0%",
      icon: Repeat,
      color: "text-cyan-400 bg-cyan-950/60 border-cyan-500/30",
      what: "Percentage of external contributors who come back for a second or third PR. The best indicator of a welcoming team.",
      how: "Percentile rank. If 40% of first-time contributors return, that's a strong signal.",
      window: "Past year",
    },
    {
      name: "Review Cycle Efficiency",
      weight: "5.0%",
      icon: HelpCircle,
      color: "text-orange-400 bg-orange-950/60 border-orange-500/30",
      what: "Median review comments per merged PR. Rewards clear, consolidated feedback. Penalizes week-long nitpick cycles.",
      how: "Lower is better. Inverted percentile or absolute: ≤2 comments = 100, ≤4 = 80, ≤6 = 50, >6 = 20.",
      window: "Per PR",
    },
    {
      name: "Maintainer Team Breadth",
      weight: "15.0%",
      icon: Users,
      color: "text-rose-400 bg-rose-950/60 border-rose-500/30",
      what: "Number of distinct active maintainers reviewing PRs. Single-maintainer repos get capped at B-tier regardless of score.",
      how: "Absolute benchmark: ≥5 = 100, 4 = 85, 3 = 70, 2 = 50, 1 = 30, 0 = 0. Bus factor ≤1 → max tier B.",
      window: "90-day active",
    },
    {
      name: "Issue & Discussion Responsiveness",
      weight: "2.5%",
      icon: Sparkles,
      color: "text-teal-400 bg-teal-950/60 border-teal-500/30",
      what: "Percentage of external PRs that received at least one human (non-bot) comment or review.",
      how: "Percentile rank. If a repo never responds to issues, this score is 0.",
      window: "180-day rolling",
    },
  ];

  const tiers = [
    {
      tier: "S",
      label: "Super Welcoming",
      scoreRange: "70–100",
      hysteresis: "68–72",
      badgeClass: "bg-emerald-600 text-white border border-white/[0.12] font-bold shadow-sm",
      indicatorColor: "bg-emerald-600",
      desc: "Active maintainers, fast review, high merge rate, first-timers succeed. This is the open door.",
    },
    {
      tier: "A",
      label: "Welcoming",
      scoreRange: "55–69",
      hysteresis: "53–57",
      badgeClass: "bg-blue-600 text-white border border-white/[0.12] font-bold shadow-sm",
      indicatorColor: "bg-blue-600",
      desc: "Reliable, healthy repositories with dependable review cadences. Consistent feedback and positive contributor culture.",
    },
    {
      tier: "B",
      label: "Solid",
      scoreRange: "40–54",
      hysteresis: "38–42",
      badgeClass: "bg-amber-600 text-white border border-white/[0.12] font-bold shadow-sm",
      indicatorColor: "bg-amber-600",
      desc: "Active maintainers who face periodic bottlenecks. Review cycles typically take 3–7 days. Worth a try if you have time.",
    },
    {
      tier: "C",
      label: "Selective",
      scoreRange: "25–39",
      hysteresis: "23–27",
      badgeClass: "bg-violet-600 text-white border border-white/[0.12] font-bold shadow-sm",
      indicatorColor: "bg-purple-600",
      desc: "Slow review or backlogged maintainers. Best suited for seasoned developers who don't mind long turnaround delays.",
    },
    {
      tier: "D",
      label: "Risky",
      scoreRange: "0–24",
      hysteresis: "<27",
      badgeClass: "bg-rose-600 text-white border border-white/[0.12] font-bold shadow-sm",
      indicatorColor: "bg-rose-600",
      desc: "Stale repositories or abandoned PR queues. Avoid unless actively requested by current maintainers.",
    },
  ];

  const formulaSteps = [
    {
      step: "1",
      title: "Collect PRs from the last 180 days",
      detail:
        "We pull every external PR (author association: CONTRIBUTOR, FIRST_TIME_CONTRIBUTOR, or NONE) from the last 180 days via GitHub GraphQL. Bots are filtered out: [bot], vercel, github-actions, codecov, dependabot, stale, sentry-io.",
    },
    {
      step: "2",
      title: "Compute raw metrics",
      detail:
        "From those PRs we calculate 9 raw values: external merge rate, median time-to-first-response, median time-to-merge, first-timer success rate, repeat contributor rate, review rounds, distinct maintainer count, last activity days, and review coverage.",
    },
    {
      step: "3",
      title: "Normalize to 0–100",
      detail:
        "Each metric is normalized against the full 102k-repo population using percentile rank. Time-based metrics (response, merge) use inverted percentiles: lower hours = higher score. When a repo has fewer than 2 peers, we fall back to absolute benchmarks instead of percentiles.",
    },
    {
      step: "4",
      title: "Apply the weighted sum",
      detail:
        "MergeRate × 0.225 + ResponseTime × 0.125 + ActivityRecency × 0.125 + FirstTimer × 0.100 + TimeToMerge × 0.100 + RepeatContributor × 0.100 + ReviewRounds × 0.050 + MaintainerBreadth × 0.150 + Responsiveness × 0.025 = raw score (0–100).",
    },
    {
      step: "5",
      title: "Add GFI bonus (capped at +5)",
      detail:
        "Repos with open 'good first issue' labels get a damped logarithmic bonus: min(5.0, 2.5 × ln(1 + GFI count)). A repo with 10 GFIs gets ~5.5 points. A repo with 1 GFI gets ~1.7 points.",
    },
    {
      step: "6",
      title: "Shrink towards 50 for low-sample repos",
      detail:
        "We apply Bayesian shrinkage: confidence = 1 − exp(−n / 6.0), where n = total external PRs. A repo with 3 PRs gets ~39% confidence → score is 39% raw + 61% neutral (50). A repo with 20 PRs gets ~97% confidence → almost no shrinkage. This prevents 3-PR repos from gaming S-tier.",
    },
    {
      step: "7",
      title: "Apply staleness cap",
      detail:
        "If a repo has no merged external PR in the last 180 days, OR last activity ≥ 180 days, OR external merge rate = 0 → score is capped at 29.9 and tier is forced to D, regardless of other signals.",
    },
    {
      step: "8",
      title: "Enforce bus factor safety",
      detail:
        "If distinct active maintainers ≤ 1, the maximum possible tier is B, even if the score says A or S. Single-maintainer projects are inherently risky for contributors.",
    },
    {
      step: "9",
      title: "Assign tier with hysteresis",
      detail:
        "Raw score → baseline tier: S ≥ 70, A ≥ 55, B ≥ 40, C ≥ 25, D < 25. Then we apply hysteresis to prevent tier flapping: S retains within 68–72, A within 53–57, B within 38–42, C within 23–27. A repo needs to drop below the demotion threshold to fall, not just touch it.",
    },
  ];

  const exclusions = [
    "Archived repos - excluded entirely.",
    "Forks - excluded entirely.",
    "Private repos - excluded entirely.",
    "Bot accounts - [bot], vercel, github-actions, codecov, dependabot, stale, sentry-io.",
    "Internal PRs - only CONTRIBUTOR, FIRST_TIME_CONTRIBUTOR, and NONE associations count as external.",
    "PRs older than 180 days - outside the rolling window.",
    "Repos with fewer than 2 normalisation peers - percentile metrics collapse to neutral 50; absolute benchmarks are used instead.",
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent dev-grid-pattern">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "How C-Rank™ Works - The Exact Math Behind Open Source Hospitality Scores",
            description:
              "9 signals, weighted sum, Bayesian shrinkage, tier thresholds, staleness rules, and the open-source scoring module - all explained.",
            url: "https://getmerged.abhishekco.de/how-c-rank-works",
            datePublished: "2026-08-01T00:00:00Z",
            dateModified: "2026-09-06T00:00:00Z",
            author: {
              "@type": "Person",
              name: "Abhishek Soni",
              url: "https://getmerged.abhishekco.de/about",
            },
            image: "https://getmerged.abhishekco.de/opengraph-image.png",
            publisher: {
              "@type": "Organization",
              name: "GetMerged",
              url: "https://getmerged.abhishekco.de",
              logo: {
                "@type": "ImageObject",
                url: "https://getmerged.abhishekco.de/icon.svg",
              },
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://getmerged.abhishekco.de",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "How C-Rank Works",
                item: "https://getmerged.abhishekco.de/how-c-rank-works",
              },
            ],
          }),
        }}
      />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full font-sans text-zinc-200">
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel border border-white/[0.1] text-xs text-zinc-300 hover:text-white transition-colors mb-8 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Narrative Opener */}
        <div className="rounded-3xl glass-panel p-8 sm:p-12 border border-white/[0.1] shadow-xs mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl glass-card text-white font-mono text-xs font-semibold mb-4">
            <DoorOpen className="h-3.5 w-3.5 text-amber-400" /> How GetMerged Scores Repositories
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-space text-white tracking-tight leading-tight">
            The exact math behind C-Rank™
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-300 max-w-3xl leading-relaxed font-sans">
            I built GetMerged because I sent 11 PRs to open-source projects in 2024. Three got reviewed. The rest rotted in backlogs on repos with 40k+ stars. I wanted to know, before I wrote a single line of code, whether the maintainer was actually going to respond.
          </p>
          <p className="mt-3 text-base text-zinc-300 max-w-3xl leading-relaxed font-sans font-medium">
            This page is the answer. Every signal, every weight, every threshold, every edge case. The scoring module is open-source. The math is auditable. If we&apos;re wrong, you can see exactly why.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="https://github.com/abhisheksoni27/opendoor/tree/main/backend/internal/scoring"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel border border-white/[0.1] text-xs text-zinc-300 hover:text-white transition-colors font-mono"
            >
              <Code2 className="h-3.5 w-3.5" /> scoring/ on GitHub
            </Link>
            <Link
              href="/rankings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel border border-white/[0.1] text-xs text-zinc-300 hover:text-white transition-colors font-mono"
            >
              <Calculator className="h-3.5 w-3.5" /> Live leaderboard (S-tier)
            </Link>
          </div>
        </div>

        {/* The 9 Signals */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-white/[0.1] pb-4">
            <h2 className="text-2xl font-bold font-space text-white">
              The 9 Signals
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1">
              Every repository is scored on these 9 signals. Each is normalized to 0–100 against the full 102k-repo population, then combined with the weights below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {signals.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="rounded-2xl glass-panel p-6 sm:p-7 border border-white/[0.1] shadow-xs hover:border-white/[0.12] transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-5"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${item.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-zinc-300">
                          {item.weight}
                        </span>
                        <h3 className="font-space text-lg font-bold text-white">
                          {item.name}
                        </h3>
                      </div>
                      <p className="text-sm font-semibold text-zinc-200 font-sans mb-1.5">
                        {item.what}
                      </p>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                        {item.how}
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-md glass-card border border-white/[0.1] text-zinc-300 text-[10px] font-mono font-semibold">
                        {item.window}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* The Formula */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-white/[0.1] pb-4">
            <h2 className="text-2xl font-bold font-space text-white">
              The Formula
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1">
              9 steps from raw GitHub data to a C-Rank score and tier. No black boxes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {formulaSteps.map((step) => (
              <div
                key={step.step}
                className="rounded-2xl glass-panel p-6 border border-white/[0.1] shadow-xs flex flex-col sm:flex-row gap-4"
              >
                <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/[0.12] flex items-center justify-center font-mono text-sm font-bold text-white shrink-0">
                  {step.step}
                </div>
                <div>
                  <h3 className="font-space text-base font-bold text-white mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Thresholds */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-white/[0.1] pb-4">
            <h2 className="text-2xl font-bold font-space text-white">
              Tier Thresholds & Hysteresis
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1">
              Raw score maps to a tier. Hysteresis prevents tier flapping from weekly noise. A repo needs to drop below the demotion line to fall, not just touch it.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl glass-panel border border-white/[0.1] shadow-xs">
            <table className="w-full text-left text-xs text-zinc-300 font-sans">
              <thead className="bg-[#141414] text-zinc-200 border-b border-white/[0.1] font-semibold font-space uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-5">Tier</th>
                  <th className="py-3.5 px-4 text-center font-mono">Score Range</th>
                  <th className="py-3.5 px-4 text-center font-mono">Hysteresis Band</th>
                  <th className="py-3.5 px-4 text-center font-mono">Demotion Below</th>
                  <th className="py-3.5 px-5">What it means</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08] font-sans">
                {tiers.map((t) => (
                  <tr key={t.tier} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg font-mono text-sm font-bold border ${t.badgeClass}`}
                      >
                        {t.label} ({t.tier})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-zinc-300">
                      {t.scoreRange}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-zinc-300">
                      {t.hysteresis}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-zinc-300">
                      {t.tier === "S"
                        ? "< 68"
                        : t.tier === "A"
                          ? "< 53"
                          : t.tier === "B"
                            ? "< 38"
                            : t.tier === "C"
                              ? "< 23"
                              : " - "}
                    </td>
                    <td className="py-3.5 px-5 text-zinc-300">{t.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Safety Rules */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-white/[0.1] pb-4">
            <h2 className="text-2xl font-bold font-space text-white">
              Safety Rules That Override Everything
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1">
              These rules are non-negotiable. They exist because a number without context is dangerous.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl glass-panel p-6 border border-white/[0.1] shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h3 className="font-space text-base font-bold text-white">
                  Staleness Cap
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                No merged external PR in 180 days, OR last activity ≥ 180 days, OR merge rate = 0 → score capped at 29.9, tier forced to D. A repo that hasn&apos;t merged anything in 6 months is not &quot;solid.&quot; It&apos;s dormant.
              </p>
            </div>

            <div className="rounded-2xl glass-panel p-6 border border-white/[0.1] shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-rose-400" />
                <h3 className="font-space text-base font-bold text-white">
                  Bus Factor Cap
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                ≤1 distinct active maintainer → maximum tier B, regardless of score. A single-maintainer project is inherently risky for contributors. If that person goes on vacation, your PR sits.
              </p>
            </div>

            <div className="rounded-2xl glass-panel p-6 border border-white/[0.1] shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="font-space text-base font-bold text-white">
                  Bayesian Shrinkage
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                Repos with few PRs get pulled toward a neutral 50. Confidence = 1 − exp(−n / 6.0). At n=3 PRs, confidence is ~39%. At n=20, it&apos;s ~97%. This prevents 3-PR repos from achieving undeserved S-tiers.
              </p>
            </div>

            <div className="rounded-2xl glass-panel p-6 border border-white/[0.1] shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-blue-400" />
                <h3 className="font-space text-base font-bold text-white">
                  Low-Sample Flag
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                Repos with fewer than 2 normalisation peers (i.e., almost no other repos in the same language/ecosystem with comparable PR volume) get percentile metrics collapsed to neutral 50. The score is still computed, but it&apos;s marked with a &quot;low sample&quot; flag and the repo is not eligible for S/A tier.
              </p>
            </div>
          </div>
        </div>

        {/* Exclusions */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-white/[0.1] pb-4">
            <h2 className="text-2xl font-bold font-space text-white">
              What We Exclude
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1">
              Not every repo qualifies. Here&apos;s what gets filtered out before scoring begins.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {exclusions.map((item) => (
              <div
                key={item}
                className="rounded-xl glass-panel p-4 border border-white/[0.1] shadow-xs flex items-start gap-3"
              >
                <div className="h-5 w-5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold">✕</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology Changelog */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-white/[0.1] pb-4">
            <h2 className="text-2xl font-bold font-space text-white">
              Methodology Changelog
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1">
              We version our scoring parameters. If weights or thresholds change, it gets logged here.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl glass-panel p-6 border border-white/[0.1] shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  v2026.1
                </span>
                <span className="text-xs text-zinc-300 font-mono">Q1 2026</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                Initial public release. 9-signal weighted sum, Bayesian shrinkage (k=6.0, prior=50), 90-day rolling window, staleness cap at 180 days, bus factor ≤1 → max B, GFI bonus capped at +5, hysteresis bands ±2.0. Calibrated against 12,000 PR outcomes.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-3xl glass-card text-white p-8 sm:p-12 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold font-space">
              See the math in action
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 mt-2 font-sans">
              Browse 102k repos ranked by C-Rank™. Filter by language, tier, stars, merge rate, first-timer success. Or scan a repo that isn&apos;t scored yet.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/repos"
              title="Explore Open Source Repositories on GetMerged"
              className="inline-flex items-center gap-2 rounded-xl glass-panel px-6 py-3 font-sans text-xs font-bold text-white hover:glass-card active:scale-95 transition-all shadow-xs"
            >
              <span>Explore Repos</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/stack"
              title="Scan your dependencies for good first issues"
              className="inline-flex items-center gap-2 rounded-xl glass-panel px-6 py-3 font-sans text-xs font-bold text-white hover:glass-card active:scale-95 transition-all shadow-xs"
            >
              <span>Scan My Stack</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
