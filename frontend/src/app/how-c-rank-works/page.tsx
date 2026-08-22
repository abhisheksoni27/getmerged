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
  Ghost,
  DoorOpen,
  HeartCrack,
} from "lucide-react";

export const metadata: Metadata = {
  title: "How C-Rank™ Works - The Science of Open Source Hospitality - GetMerged",
  description: "Why 60% of open-source maintainers burn out and millions of pull requests become zombie PRs. Learn how GetMerged filters open doors from ghost towns.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/how-c-rank-works",
  },
  openGraph: {
    title: "How C-Rank™ Works - The Science of Open Source Hospitality",
    description: "GitHub stars measure past vanity. C-Rank measures present hospitality. Explore how we calculate real maintainer velocity from raw GraphQL telemetry.",
    url: "https://getmerged.abhishekco.de/how-c-rank-works",
    siteName: "GetMerged",
  },
};

export default function HowCRankWorksPage() {
  const telemetryPillars = [
    {
      name: "External PR Acceptance Rate",
      priority: "Primary Filter",
      icon: GitMerge,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      headline: "Are outside submissions welcomed into main?",
      desc: "Measures whether non-maintainer community code actually reaches production. Filters out internal bot merges, automated dependencies, and core-team-only branches.",
    },
    {
      name: "Reviewer Response Turnaround",
      priority: "Velocity Core",
      icon: Clock,
      color: "text-blue-700 bg-blue-50 border-blue-200",
      headline: "The 24-Hour Momentum Window",
      desc: "Calculates the median hours before a human reviewer leaves an actionable reply. PRs that wait more than 7 days have an 80% higher abandon rate.",
    },
    {
      name: "Commit Pulse & Recency",
      priority: "Freshness Signal",
      icon: Activity,
      color: "text-purple-700 bg-purple-50 border-purple-200",
      headline: "Active Heartbeat vs. Dormant Giant",
      desc: "Monitors active commit rhythms across a rolling 180-day window, ensuring you never write code for a project whose maintainers stepped away months ago.",
    },
    {
      name: "First-Timer Contributor Success",
      priority: "Hospitality Metric",
      icon: ShieldCheck,
      color: "text-amber-700 bg-amber-50 border-amber-200",
      headline: "Do new authors receive constructive onboarding?",
      desc: "Specifically evaluates developers opening their first pull request. Separates patient, mentorship-driven teams from insular, gatekept codebases.",
    },
    {
      name: "Resolution & Land Velocity",
      priority: "Velocity Metric",
      icon: Zap,
      color: "text-indigo-700 bg-indigo-50 border-indigo-200",
      headline: "Speed to final merge without infinite rebasing",
      desc: "Tracks total hours from initial opening to merged commit, preventing the dreaded weeks-long cycle of repeated merge-conflict resolution.",
    },
    {
      name: "Repeat Contributor Retention",
      priority: "Culture Signal",
      icon: Repeat,
      color: "text-cyan-700 bg-cyan-50 border-cyan-200",
      headline: "Do contributors return for PR #2 and #3?",
      desc: "Measures whether outside developers enjoy their first experience enough to stay and contribute regularly. The ultimate proof of healthy maintainer empathy.",
    },
    {
      name: "Review Cycle Density",
      priority: "Friction Signal",
      icon: HelpCircle,
      color: "text-orange-700 bg-orange-50 border-orange-200",
      headline: "Clear, consolidated guidance vs. endless nitpicks",
      desc: "Analyzes comment patterns per merged pull request to reward consolidated, respectful review rounds over fragmented multi-week review churn.",
    },
    {
      name: "Maintainer Core Distribution",
      priority: "Bus-Factor Metric",
      icon: Users,
      color: "text-rose-700 bg-rose-50 border-rose-200",
      headline: "Multi-maintainer review cores",
      desc: "Evaluates the number of active distinct reviewers. Projects with distributed review teams avoid single-maintainer bottlenecks and burnout freezes.",
    },
    {
      name: "Issue & Discussion Triage",
      priority: "Community Health",
      icon: Sparkles,
      color: "text-emerald-800 bg-emerald-50 border-emerald-200",
      headline: "Proactive issue scoping and triaging",
      desc: "Tracks maintainer responsiveness on incoming issues and discussions to evaluate whether the project actively guides prospective contributors.",
    },
  ];

  const tiers = [
    {
      tier: "S",
      label: "Super Welcoming",
      badgeClass: "bg-[#8ce99a] text-black border-2 border-black font-bold shadow-[2px_2px_0px_#000]",
      indicatorColor: "bg-emerald-600",
      desc: "The open doors. Pull requests receive active review within 24 hours, maintainers provide friendly guidance, and new contributor merge rates exceed 80%.",
    },
    {
      tier: "A",
      label: "Welcoming",
      badgeClass: "bg-[#bfdbff] text-black border-2 border-black font-bold shadow-[2px_2px_0px_#000]",
      indicatorColor: "bg-blue-600",
      desc: "Reliable, healthy repositories with dependable review cadences. Consistent feedback and positive contributor culture.",
    },
    {
      tier: "B",
      label: "Moderate",
      badgeClass: "bg-[#ffd93d] text-black border-2 border-black font-bold shadow-[2px_2px_0px_#000]",
      indicatorColor: "bg-amber-600",
      desc: "Active maintainers who face periodic review bottlenecks around major release sprints. Review cycles typically take 3 to 7 days.",
    },
    {
      tier: "C",
      label: "Slow Review",
      badgeClass: "bg-[#e5dbff] text-black border-2 border-black font-bold shadow-[2px_2px_0px_#000]",
      indicatorColor: "bg-purple-600",
      desc: "Selective code acceptance or backlogged maintainers. Best suited for seasoned developers who don't mind long turnaround delays.",
    },
    {
      tier: "D",
      label: "Unmaintained",
      badgeClass: "bg-[#ffb3c7] text-black border-2 border-black font-bold shadow-[2px_2px_0px_#000]",
      indicatorColor: "bg-rose-600",
      desc: "Stale repositories or abandoned pull request queues. Avoid submitting PRs here unless actively requested by current maintainers.",
    },
  ];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How C-Rank™ Works - The Science of Open Source Hospitality",
    description: "Methodology and mathematical telemetry behind C-Rank scoring for open-source GitHub repositories.",
    url: "https://getmerged.abhishekco.de/how-c-rank-works",
    publisher: {
      "@type": "Organization",
      name: "GetMerged",
      url: "https://getmerged.abhishekco.de",
    },
  };

  const breadcrumbJsonLd = {
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
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6] dev-grid-pattern">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full font-sans text-zinc-800">
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-600 hover:text-zinc-900 transition-colors mb-8 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Narrative Opener: The Contributor's Dilemma */}
        <div className="rounded-3xl bg-white p-8 sm:p-12 border border-zinc-200/80 shadow-xs mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-900 text-white font-mono text-xs font-semibold mb-4">
            <DoorOpen className="h-3.5 w-3.5 text-amber-400" /> The Science of Open Source Hospitality
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-space text-zinc-900 tracking-tight leading-tight">
            Why Millions of Pull Requests Become Zombie PRs
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 max-w-3xl leading-relaxed font-sans">
            Every day, thousands of enthusiastic developers clone a famous GitHub repository, spend late nights reading documentation, write comprehensive unit tests, and submit a pristine pull request.
          </p>
          <p className="mt-3 text-base text-zinc-700 max-w-3xl leading-relaxed font-sans font-medium">
            And then... silence. Weeks turn into months. The PR sits untouched until a merge conflict breaks it forever.
          </p>
        </div>

        {/* The Open Source Reality Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 font-sans">
          <div className="rounded-3xl bg-white p-7 border border-zinc-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
                <HeartCrack className="h-5 w-5" />
              </div>
              <div className="font-space text-2xl font-bold text-zinc-900 mb-1">60% Burnout Rate</div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Over 60% of open-source maintainers perform their work entirely unpaid and report overwhelming burnout from incoming backlog fatigue.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 font-mono text-[11px] text-zinc-400">
              Source: Maintainer Sustainability Surveys
            </div>
          </div>

          <div className="rounded-3xl bg-white p-7 border border-zinc-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
                <Ghost className="h-5 w-5" />
              </div>
              <div className="font-space text-2xl font-bold text-zinc-900 mb-1">The Star Illusion</div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                GitHub stars accumulate forever like museum plaques. A 40,000-star project could easily be an unmaintained ghost town today.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 font-mono text-[11px] text-zinc-400">
              Legacy stars vs. real maintainer pulse
            </div>
          </div>

          <div className="rounded-3xl bg-white p-7 border border-zinc-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="font-space text-2xl font-bold text-zinc-900 mb-1">The GetMerged Fix</div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                We analyze live GraphQL event streams to pinpoint repos where maintainers are active, responsive, and genuinely excited to merge community code.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 font-mono text-[11px] text-zinc-400">
              Objective maintainer telemetry
            </div>
          </div>
        </div>

        {/* The 9 Macro Signals */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-zinc-200 pb-4">
            <h2 className="text-2xl font-bold font-space text-zinc-900">
              The 9 Telemetry Signals We Monitor
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 font-sans mt-1">
              Every repository is continuously benchmarked against peer projects in the same programming ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {telemetryPillars.map((item, idx) => {
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
                      <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-sans">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 font-mono pl-15 sm:pl-0">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold">
                      {item.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier Classification Hierarchy */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-zinc-200 pb-4">
            <h2 className="text-2xl font-bold font-space text-zinc-900">
              The C-Rank™ Hospitality Ladder
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 font-sans mt-1">
              Know what to expect before you write a single line of code.
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
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-3xl bg-zinc-900 text-white p-8 sm:p-12 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold font-space">
              Find your next open door today
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 font-sans">
              Stop guessing which repos will merge your PRs. Browse repositories with verified maintainer pulse.
            </p>
          </div>
          <Link
            href="/"
            title="Explore Open Source Repositories on GetMerged"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-sans text-xs font-bold text-zinc-900 hover:bg-zinc-100 active:scale-95 transition-all shadow-xs shrink-0"
          >
            <span>Explore Welcoming Repos</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
