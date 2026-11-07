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
  ExternalLink,
  Code2,
  Calculator,
  CheckCircle2,
  Star,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "How GetMerged Scores Repositories - C-Rank™ Methodology",
  description:
    "C-Rank™ methodology: 9 signals, weighted scoring, Bayesian shrinkage for low-sample repos, staleness rules, and transparent tier classification.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/how-c-rank-works",
  },
  openGraph: {
    title: "How GetMerged Scores Repositories - C-Rank™ Methodology",
    description:
      "How we measure maintainer responsiveness, merge rates, and newcomer onboarding across 102k open-source repositories.",
    url: "https://getmerged.abhishekco.de/how-c-rank-works",
    siteName: "GetMerged",
  },
};

export default function HowCRankWorksPage() {
  const signals = [
    {
      name: "External PR Merge Rate",
      icon: GitMerge,
      color: "text-[#0D9668] bg-[#0D9668]/10 border border-[#0D9668]/20",
      what: "Ratio of merged vs. closed outside-community PRs. Excludes automated dependency bots and internal branch merges.",
      how: "Normalized against the full repository population. A repo merging a high percentage of external PRs scores higher than one that closes them.",
      window: "180-day rolling",
    },
    {
      name: "Reviewer Response Turnaround",
      icon: Clock,
      color: "text-[#2D8ABF] bg-[#2D8ABF]/10 border border-[#2D8ABF]/20",
      what: "Median time before a human maintainer posts an actionable review on an external PR.",
      how: "Lower response times score higher. When enough peer data exists, we use percentile ranking. For repos with limited history, we fall back to absolute time benchmarks.",
      window: "Recent PRs",
    },
    {
      name: "Maintainer Activity Recency",
      icon: Activity,
      color: "text-[#8B6BB5] bg-[#8B6BB5]/10 border border-[#8B6BB5]/20",
      what: "Time since the last merged external PR. A repo with no recent merges is a red flag.",
      how: "Absolute benchmark scoring: more recent activity yields higher scores. A repo that hasn't merged anything in months drops fast.",
      window: "180-day lookback",
    },
    {
      name: "First-Timer Contributor Success",
      icon: ShieldCheck,
      color: "text-[#C4910A] bg-[#C4910A]/10 border border-[#C4910A]/20",
      what: "Percentage of first-time external contributors whose PR gets merged. Not just opened - merged.",
      how: "Percentile rank. We detect first-timers via GitHub's first-time contributor flag OR anyone submitting their very first PR to that repo.",
      window: "180-day rolling",
    },
    {
      name: "Time to Merge",
      icon: Zap,
      color: "text-[#4F46E5] bg-[#4F46E5]/10 border border-[#4F46E5]/20",
      what: "Median hours from PR open to final merge. Fast turnaround without endless rebasing cycles.",
      how: "Lower is better. Percentile ranking when peers exist, absolute benchmark fallback for lonely repos.",
      window: "Merged PRs only",
    },
    {
      name: "Repeat Contributor Rate",
      icon: Repeat,
      color: "text-[#0891B2] bg-[#0891B2]/10 border border-[#0891B2]/20",
      what: "Percentage of external contributors who come back for a second or third PR. The best indicator of a welcoming team.",
      how: "Percentile rank. If a significant fraction of first-timers return, that's a strong signal.",
      window: "Past year",
    },
    {
      name: "Review Cycle Efficiency",
      icon: HelpCircle,
      color: "text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20",
      what: "Review comment count per merged PR. Rewards clear, consolidated feedback. Penalizes week-long nitpick cycles.",
      how: "Lower is better. Inverted percentile or absolute benchmarks depending on peer availability.",
      window: "Per PR",
    },
    {
      name: "Maintainer Team Breadth",
      icon: Users,
      color: "text-rose-400 bg-rose-950/60 border-rose-500/30",
      what: "Number of distinct active maintainers reviewing PRs. Single-maintainer repos get a safety cap.",
      how: "Absolute benchmark with a hard ceiling: repos with only one active maintainer cannot reach the top tiers, regardless of other scores.",
      window: "90-day active",
    },
    {
      name: "Issue & Discussion Responsiveness",
      icon: Sparkles,
      color: "text-teal-400 bg-teal-950/60 border-teal-500/30",
      what: "Percentage of external PRs that received at least one human (non-bot) comment or review.",
      how: "Percentile rank. If a repo never responds to issues, this score is minimal.",
      window: "180-day rolling",
    },
  ];

  const tiers = [
    {
      tier: "S",
      label: "Super Welcoming",
      threshold: "Score ≥ 70",
      badgeClass: "bg-emerald-600 text-white border border-[var(--border-subtle)] font-bold shadow-sm",
      indicatorColor: "bg-emerald-600",
      desc: "Top 1.6% of open-source projects. High external merge rate, fast reviewer response (p50 ≤ 24h), reliable first-timer onboarding, and active maintainer breadth. This is the open door.",
    },
    {
      tier: "A",
      label: "Welcoming",
      threshold: "55 ≤ Score < 70",
      badgeClass: "bg-blue-600 text-white border border-[var(--border-subtle)] font-bold shadow-sm",
      indicatorColor: "bg-blue-600",
      desc: "Top ~12% overall. Dependable review cadences, healthy contributor feedback culture, and positive outsider acceptance.",
    },
    {
      tier: "B",
      label: "Solid",
      threshold: "40 ≤ Score < 55",
      badgeClass: "bg-amber-600 text-white border border-[var(--border-subtle)] font-bold shadow-sm",
      indicatorColor: "bg-amber-600",
      desc: "Healthy repositories with active maintainers experiencing periodic triage bottlenecks. Also includes S/A-scoring projects that are safety-capped due to single-maintainer bus factor.",
    },
    {
      tier: "C",
      label: "Selective",
      threshold: "25 ≤ Score < 40",
      badgeClass: "bg-violet-600 text-white border border-[var(--border-subtle)] font-bold shadow-sm",
      indicatorColor: "bg-purple-600",
      desc: "Slow review turnaround or strict maintainer review bars. Best suited for experienced contributors who don't mind multi-week turnaround times.",
    },
    {
      tier: "D",
      label: "Risky / Dormant",
      threshold: "Score < 25 (or stale)",
      badgeClass: "bg-rose-600 text-white border border-[var(--border-subtle)] font-bold shadow-sm",
      indicatorColor: "bg-rose-600",
      desc: "PR queues with low closure rates, abandoned reviews, or zero external activity in the lookback window. Contributors risk wasting effort here.",
    },
  ];

  const formulaSteps = [
    {
      step: "1",
      title: "Collect PRs from the last 180 days",
      detail:
        "We pull every external PR from the last 180 days via GitHub GraphQL. Bot accounts and internal maintainer PRs are filtered out. Only genuine outside contributions count.",
    },
    {
      step: "2",
      title: "Compute raw metrics",
      detail:
        "From those PRs we calculate 9 raw values: external merge rate, median time-to-first-response, median time-to-merge, first-timer success rate, repeat contributor rate, review round count, distinct maintainer count, last activity days, and review coverage.",
    },
    {
      step: "3",
      title: "Normalize to 0–100",
      detail:
        "Each metric is normalized against the full repository population. Time-based metrics reward lower values (faster is better). When a repo has insufficient peer data, we fall back to absolute benchmarks instead of percentile rankings.",
    },
    {
      step: "4",
      title: "Apply the weighted combination",
      detail:
        "The 9 normalized signals are combined with weights that reflect what matters most to contributors. Merge rate carries the most weight. Response time and activity recency are next. The remaining signals round out the picture. The exact weights are calibrated annually against real PR outcomes and versioned in the scoring module.",
    },
    {
      step: "5",
      title: "Add GFI bonus (capped)",
      detail:
        "Repos with open good-first-issue labels get a damped bonus. A repo with many beginner-friendly issues scores a modest boost. A repo with none gets nothing. The bonus is capped to prevent gaming.",
    },
    {
      step: "6",
      title: "Shrink towards neutral for low-sample repos",
      detail:
        "We apply Bayesian shrinkage: repos with very few PRs get pulled toward a neutral midpoint. A repo with 3 PRs gets a heavily discounted score. A repo with 20+ PRs is barely affected. This prevents tiny sample sizes from achieving undeserved top tiers.",
    },
    {
      step: "7",
      title: "Apply staleness cap",
      detail:
        "If a repo has no meaningful external activity within the lookback window, OR its merge rate has dropped to zero, its score is capped at a maximum and tier is forced to D. A dormant repo is not 'solid.'",
    },
    {
      step: "8",
      title: "Enforce maintainer team safety",
      detail:
        "Repos with a single active maintainer cannot reach the top tiers, regardless of other scores. Single-maintainer projects are inherently risky for contributors. If that person goes on vacation, your PR sits.",
    },
    {
      step: "9",
      title: "Assign tier with hysteresis",
      detail:
        "The composite score maps to a tier: S, A, B, C, or D. We apply hysteresis bands to prevent tier flapping from weekly noise. A repo needs to drop meaningfully below a threshold to fall, not just touch it.",
    },
  ];

  const exclusions = [
    "Archived repositories - excluded entirely.",
    "Forks - excluded entirely.",
    "Private repositories - excluded entirely.",
    "Bot accounts - automated PRs and comments are filtered out.",
    "Internal maintainer PRs - only genuine outside contributions count.",
    "PRs older than the lookback window - outside the rolling window.",
    "Repos with insufficient peer data - percentile metrics collapse to neutral; absolute benchmarks are used instead.",
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent ">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "How C-Rank™ Works - The Methodology Behind Open Source Hospitality Scores",
            description:
              "9 signals, weighted combination, Bayesian shrinkage, staleness rules, and transparent tier classification for 102k open-source repositories.",
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

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full font-sans text-[var(--text-secondary)]">
        <Link prefetch={false}
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl surface-base border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Narrative Opener */}
        <div className="rounded-3xl surface-base p-8 sm:p-12 border border-[var(--border-subtle)] shadow-xs mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl surface-elevated text-[var(--text-primary)] font-mono text-xs font-semibold mb-4">
            <DoorOpen className="h-3.5 w-3.5 text-amber-400" /> How GetMerged Scores Repositories
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-space text-[var(--text-primary)] tracking-tight leading-tight">
            The exact math behind C-Rank™
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[var(--text-secondary)] max-w-3xl leading-relaxed font-sans">
            I built GetMerged because I sent 11 PRs to open-source projects in 2024. Three got reviewed. The rest rotted in backlogs on repos with 40k+ stars. I wanted to know, before I wrote a single line of code, whether the maintainer was actually going to respond.
          </p>
          <p className="mt-3 text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed font-sans font-medium">
            This page is the answer. Every signal, every step, every safeguard. The scoring module lives in a private repository, but the methodology is fully explained here. If we&apos;re wrong, you can see exactly why and dispute it.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link prefetch={false}
              href="https://github.com/abhisheksoni27/opendoor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-base border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-mono"
            >
              <Code2 className="h-3.5 w-3.5" /> scoring module on GitHub
            </Link>
            <Link prefetch={false}
              href="/rankings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-base border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-mono"
            >
              <Calculator className="h-3.5 w-3.5" /> Live leaderboard (S-tier)
            </Link>
          </div>
        </div>

        {/* The 9 Signals */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-2xl font-bold font-space text-[var(--text-primary)]">
              The 9 Signals
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-1">
              Every repository is scored on these 9 signals. Each is normalized to 0–100 against the full population, then combined into a single C-Rank score.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {signals.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="rounded-2xl surface-base p-6 sm:p-7 border border-[var(--border-subtle)] shadow-xs hover:border-[var(--border-subtle)] transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-5"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${item.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-space text-lg font-bold text-[var(--text-primary)] mb-1">
                        {item.name}
                      </h3>
                      <p className="text-sm font-semibold text-[var(--text-secondary)] font-sans mb-1.5">
                        {item.what}
                      </p>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                        {item.how}
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-md surface-elevated border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[10px] font-mono font-semibold">
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
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-2xl font-bold font-space text-[var(--text-primary)]">
              How the Score Is Built
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-1">
              9 steps from raw GitHub data to a C-Rank score and tier. No black boxes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {formulaSteps.map((step) => (
              <div
                key={step.step}
                className="rounded-2xl surface-base p-6 border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row gap-4"
              >
                <div className="h-8 w-8 rounded-lg bg-white/10 border border-[var(--border-subtle)] flex items-center justify-center font-mono text-sm font-bold text-[var(--text-primary)] shrink-0">
                  {step.step}
                </div>
                <div>
                  <h3 className="font-space text-base font-bold text-[var(--text-primary)] mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Classification */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-2xl font-bold font-space text-[var(--text-primary)]">
              Tier Classification
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-1">
              The composite score maps to a tier. Hysteresis bands prevent tier flapping from weekly noise. A repo needs to drop meaningfully below a threshold to fall, not just touch it.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tiers.map((t) => (
              <div
                key={t.tier}
                className="rounded-2xl surface-base p-6 border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-xl font-mono text-sm font-bold border shrink-0 flex items-center gap-2 ${t.badgeClass}`}>
                      <span className={`h-2 w-2 rounded-full ${t.indicatorColor}`} />
                      <span>{t.label} ({t.tier})</span>
                    </div>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white/[0.06] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      {t.threshold}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans leading-relaxed max-w-xl">
                    {t.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worked Example */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-2xl font-bold font-space text-[var(--text-primary)] flex items-center gap-2">
              <Calculator className="h-6 w-6 text-emerald-400" />
              Worked Example: How an S-Tier Repo Is Scored
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-1">
              Real numbers from our database. Here is how <strong className="text-[var(--text-primary)]">HeyPuter/puter</strong> (43k+ stars) and <strong className="text-[var(--text-primary)]">SubtitleEdit/subtitleedit</strong> earn their S-tier ranking.
            </p>
          </div>

          <div className="rounded-2xl surface-base p-6 sm:p-8 border border-[var(--border-subtle)] shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-space text-xl font-bold text-[var(--text-primary)]">HeyPuter/puter</span>
                  <span className="flex items-center gap-1 text-xs font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 43,383
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">JavaScript / Cloud Desktop &middot; 753 PRs evaluated in trailing window</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-mono text-[var(--text-secondary)]">Final C-Rank</div>
                  <div className="text-2xl font-bold font-space text-emerald-400">70.05 / 100</div>
                </div>
                <div className="px-3 py-1.5 rounded-xl font-mono text-sm font-bold bg-emerald-600 text-white border border-[var(--border-subtle)]">
                  Tier S
                </div>
              </div>
            </div>

            {/* Step-by-step breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-[var(--border-subtle)]">
                <div className="text-xs font-mono text-[var(--text-secondary)] mb-1">1. Outside Merge Rate</div>
                <div className="text-xl font-bold font-space text-emerald-400">89.3%</div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">Nearly 9 out of 10 external PRs are merged. Tops the 93rd percentile of JavaScript repos.</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-[var(--border-subtle)]">
                <div className="text-xs font-mono text-[var(--text-secondary)] mb-1">2. First-Timer Success</div>
                <div className="text-xl font-bold font-space text-blue-400">54.5%</div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">Over half of brand-new contributors have their initial PR accepted and merged into master.</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-[var(--border-subtle)]">
                <div className="text-xs font-mono text-[var(--text-secondary)] mb-1">3. Team Breadth (Bus Factor)</div>
                <div className="text-xl font-bold font-space text-purple-400">34 Maintainers</div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">34 distinct maintainers actively review PRs. Far above the single-maintainer safety cap ceiling.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-mono space-y-2 text-[var(--text-secondary)]">
              <div className="text-[var(--text-primary)] font-bold font-space">The Calculation Flow:</div>
              <div>&bull; <span className="text-amber-300">Raw Composite:</span> 9 signals weighted &rarr; 67.8 points</div>
              <div>&bull; <span className="text-amber-300">Logarithmic GFI Bonus:</span> 3 curated GFIs &rarr; <code className="text-emerald-400">2.5 &times; ln(1 + 3) = +3.47</code> bonus points</div>
              <div>&bull; <span className="text-amber-300">Bayesian Confidence Weight:</span> N = 753 PRs &rarr; <code className="text-emerald-400">1 - exp(-753 / 6.0) &approx; 1.00</code> (Zero shrinkage penalty)</div>
              <div>&bull; <span className="text-amber-300">Bus Factor Check:</span> 34 maintainers &gt; 1 &rarr; Safe from Tier B cap</div>
              <div>&bull; <span className="text-amber-300">Final Score:</span> 70.05 &rarr; Crosses the 70.0 threshold &rarr; <strong className="text-emerald-400">Awarded Tier S</strong></div>
            </div>
          </div>
        </div>

        {/* Safety Rules */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-2xl font-bold font-space text-[var(--text-primary)]">
              Safety Rules That Override Everything
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-1">
              These rules are non-negotiable. They exist because a number without context is dangerous.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl surface-base p-6 border border-[var(--border-subtle)] shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <HeartCrack className="h-5 w-5 text-rose-400" />
                <h3 className="font-space text-base font-bold text-[var(--text-primary)]">
                  Staleness Cap
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                Repos with no meaningful external activity within the lookback window, OR zero merge rate, are capped at a low maximum score and forced to D-tier. A repo that hasn&apos;t merged anything in months is not &quot;solid.&quot; It&apos;s dormant.
              </p>
            </div>

            <div className="rounded-2xl surface-base p-6 border border-[var(--border-subtle)] shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-rose-400" />
                <h3 className="font-space text-base font-bold text-[var(--text-primary)]">
                  Maintainer Team Safety
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                Repos with a single active maintainer cannot reach the top tiers, regardless of other scores. Single-maintainer projects are inherently risky for contributors. If that person goes on vacation, your PR sits.
              </p>
            </div>

            <div className="rounded-2xl surface-base p-6 border border-[var(--border-subtle)] shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="font-space text-base font-bold text-[var(--text-primary)]">
                  Bayesian Shrinkage
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                Repos with very few PRs get pulled toward a neutral midpoint. A repo with 3 PRs gets a heavily discounted score. A repo with 20+ PRs is barely affected. This prevents tiny sample sizes from achieving undeserved top tiers.
              </p>
            </div>

            <div className="rounded-2xl surface-base p-6 border border-[var(--border-subtle)] shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-blue-400" />
                <h3 className="font-space text-base font-bold text-[var(--text-primary)]">
                  Low-Sample Flag
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                Repos with insufficient peer data get percentile metrics collapsed to neutral. The score is still computed, but it&apos;s marked with a &quot;low sample&quot; flag and the repo is not eligible for S/A tier.
              </p>
            </div>
          </div>
        </div>

        {/* Exclusions */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-2xl font-bold font-space text-[var(--text-primary)]">
              What We Exclude
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-1">
              Not every repo qualifies. Here&apos;s what gets filtered out before scoring begins.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {exclusions.map((item) => (
              <div
                key={item}
                className="rounded-xl surface-base p-4 border border-[var(--border-subtle)] shadow-xs flex items-start gap-3"
              >
                <div className="h-5 w-5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold">✕</span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology Changelog */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-2xl font-bold font-space text-[var(--text-primary)]">
              Methodology Changelog
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-1">
              We version our scoring parameters. If weights or thresholds change, it gets logged here.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl surface-base p-6 border border-[var(--border-subtle)] shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    v2026.2
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-mono">Active (September 2026)</span>
                </div>
                <Link prefetch={false}
                  href="/methodology/changelog"
                  className="text-xs font-mono text-amber-400 hover:text-amber-300 underline"
                >
                  Full audit log &amp; dispute history &rarr;
                </Link>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                Bayesian shrinkage prior (k = 6.0), bus-factor safety cap (single maintainer ceiling at Tier B), continuous logarithmic GFI curve, and 48-hour human dispute SLA with public recalibration audit logging.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-3xl surface-base p-8 sm:p-12 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold font-space">
              See the methodology in action
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 font-sans">
              Browse 102k repos ranked by C-Rank™. Filter by language, tier, stars, merge rate, first-timer success. Or scan a repo that isn&apos;t scored yet.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link prefetch={false}
              href="/repos"
              title="Explore Open Source Repositories on GetMerged"
              className="inline-flex items-center gap-2 rounded-xl surface-base px-6 py-3 font-sans text-xs font-bold text-[var(--text-primary)] hover:surface-elevated active:scale-95 transition-all shadow-xs"
            >
              <span>Explore Repos</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link prefetch={false}
              href="/stack"
              title="Scan your dependencies for good first issues"
              className="inline-flex items-center gap-2 rounded-xl surface-base px-6 py-3 font-sans text-xs font-bold text-[var(--text-primary)] hover:surface-elevated active:scale-95 transition-all shadow-xs"
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
