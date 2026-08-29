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
  title: "How GetMerged Scores Repositories - C-Rank™ Methodology",
  description: "Find active, welcoming GitHub projects that actually review and merge pull requests. Learn how we measure maintainer response time, merge rates, and newcomer onboarding.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/how-c-rank-works",
  },
  openGraph: {
    title: "How GetMerged Scores Repositories - C-Rank™ Methodology",
    description: "GitHub stars measure popularity. C-Rank measures active maintainers. Learn how we check review response times and merge rates directly from GitHub activity.",
    url: "https://getmerged.abhishekco.de/how-c-rank-works",
    siteName: "GetMerged",
  },
};

export default function HowCRankWorksPage() {
  const telemetryPillars = [
    {
      name: "External PR Acceptance Rate",
      priority: "Primary Factor",
      icon: GitMerge,
      color: "text-emerald-400 bg-emerald-950/60 border-emerald-500/30",
      headline: "Are outside submissions welcomed into main?",
      desc: "Measures whether non-maintainer community code actually reaches production. Filters out automated dependency bots and internal branch merges.",
    },
    {
      name: "Reviewer Response Turnaround",
      priority: "Review Speed",
      icon: Clock,
      color: "text-blue-400 bg-blue-950/60 border-blue-500/30",
      headline: "The 24-Hour Review Window",
      desc: "Calculates median hours before a maintainer leaves an actionable review. PRs that wait more than 7 days without feedback have an 80% higher abandonment rate.",
    },
    {
      name: "Commit Rhythm & Recency",
      priority: "Activity Recency",
      icon: Activity,
      color: "text-purple-400 bg-purple-950/60 border-purple-500/30",
      headline: "Active Maintainers vs. Stale Repos",
      desc: "Monitors commit activity across a rolling 180-day window, ensuring you don't spend time contributing to a project whose team stepped away.",
    },
    {
      name: "First-Timer Contributor Success",
      priority: "Beginner Friendly",
      icon: ShieldCheck,
      color: "text-amber-400 bg-amber-950/60 border-amber-500/30",
      headline: "Do new authors receive constructive onboarding?",
      desc: "Tracks developers opening their very first pull request. Separates supportive, mentorship-driven teams from closed, unresponsive repos.",
    },
    {
      name: "Merge Speed & Cycle Duration",
      priority: "Merge Speed",
      icon: Zap,
      color: "text-indigo-400 bg-indigo-950/60 border-indigo-500/30",
      headline: "Fast turnaround without endless rebasing",
      desc: "Measures the time from initial opening to final merge, avoiding weeks-long cycles of unresolved merge conflicts and review stalling.",
    },
    {
      name: "Repeat Contributor Retention",
      priority: "Community Health",
      icon: Repeat,
      color: "text-cyan-400 bg-cyan-950/60 border-cyan-500/30",
      headline: "Do contributors return for PR #2 and #3?",
      desc: "Checks if developers enjoy their first contribution experience enough to come back. The best indicator of welcoming, supportive maintainers.",
    },
    {
      name: "Review Cycle Efficiency",
      priority: "Review Quality",
      icon: HelpCircle,
      color: "text-orange-400 bg-orange-950/60 border-orange-500/30",
      headline: "Clear guidance vs. fragmented nitpicks",
      desc: "Rewards teams that provide consolidated, clear review feedback in fewer rounds rather than dragging reviews out over weeks.",
    },
    {
      name: "Active Review Team Breadth",
      priority: "Team Health",
      icon: Users,
      color: "text-rose-400 bg-rose-950/60 border-rose-500/30",
      headline: "Multiple active reviewers",
      desc: "Evaluates the number of active distinct reviewers. Projects with distributed review teams avoid single-maintainer bottlenecks and burnout.",
    },
    {
      name: "Issue & Discussion Response",
      priority: "Responsiveness",
      icon: Sparkles,
      color: "text-emerald-400 bg-emerald-950/60 border-emerald-500/30",
      headline: "Proactive issue triaging and scoping",
      desc: "Tracks how quickly maintainers respond to questions on issues and discussions to see if they actively help new contributors get started.",
    },
  ];

  const tiers = [
    {
      tier: "S",
      label: "Super Welcoming",
      badgeClass: "bg-emerald-600 text-white border border-white/[0.12] font-bold shadow-sm",
      indicatorColor: "bg-emerald-600",
      desc: "The open doors. Pull requests receive active review within 24 hours, maintainers provide friendly guidance, and new contributor merge rates exceed 80%.",
    },
    {
      tier: "A",
      label: "Welcoming",
      badgeClass: "bg-blue-600 text-white border border-white/[0.12] font-bold shadow-sm",
      indicatorColor: "bg-blue-600",
      desc: "Reliable, healthy repositories with dependable review cadences. Consistent feedback and positive contributor culture.",
    },
    {
      tier: "B",
      label: "Moderate",
      badgeClass: "bg-amber-600 text-white border border-white/[0.12] font-bold shadow-sm",
      indicatorColor: "bg-amber-600",
      desc: "Active maintainers who face periodic review bottlenecks around major release sprints. Review cycles typically take 3 to 7 days.",
    },
    {
      tier: "C",
      label: "Slow Review",
      badgeClass: "bg-violet-600 text-white border border-white/[0.12] font-bold shadow-sm",
      indicatorColor: "bg-purple-600",
      desc: "Selective code acceptance or backlogged maintainers. Best suited for seasoned developers who don't mind long turnaround delays.",
    },
    {
      tier: "D",
      label: "Unmaintained",
      badgeClass: "bg-rose-600 text-white border border-white/[0.12] font-bold shadow-sm",
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
    datePublished: "2026-08-01T00:00:00Z",
    dateModified: "2026-08-23T00:00:00Z",
    author: {
      "@type": "Organization",
      name: "GetMerged Engineering Team",
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
    <div className="relative min-h-screen flex flex-col bg-transparent dev-grid-pattern">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full font-sans text-zinc-200">
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel border border-white/[0.1] text-xs text-zinc-300 hover:text-white transition-colors mb-8 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Narrative Opener: The Contributor's Dilemma */}
        <div className="rounded-3xl glass-panel p-8 sm:p-12 border border-white/[0.1] shadow-xs mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl glass-card text-white font-mono text-xs font-semibold mb-4">
            <DoorOpen className="h-3.5 w-3.5 text-amber-400" /> How GetMerged Scores Repositories
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-space text-white tracking-tight leading-tight">
            Why Pull Requests Get Ignored (And How to Find Repos That Merge Yours)
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-300 max-w-3xl leading-relaxed font-sans">
            Every day, developers clone a popular GitHub repository, read docs, write tests, and submit a clean pull request.
          </p>
          <p className="mt-3 text-base text-zinc-300 max-w-3xl leading-relaxed font-sans font-medium">
            And then... silence. Weeks turn into months. The PR sits untouched until merge conflicts break it. GetMerged fixes this by measuring real maintainer activity before you write a single line of code.
          </p>
        </div>

        {/* The Open Source Reality Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 font-sans">
          <div className="rounded-3xl glass-panel p-7 border border-white/[0.1] shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-center text-rose-600 mb-4">
                <HeartCrack className="h-5 w-5" />
              </div>
              <div className="font-space text-2xl font-bold text-white mb-1">60% Maintainer Burnout</div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Most open source maintainers work unpaid in their spare time. When popular projects get overwhelmed by issues, review queues slow to a crawl.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.1] font-mono text-[11px] text-zinc-300">
              Source: Open Source Maintainer Surveys
            </div>
          </div>

          <div className="rounded-3xl glass-panel p-7 border border-white/[0.1] shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-center text-amber-600 mb-4">
                <Ghost className="h-5 w-5" />
              </div>
              <div className="font-space text-2xl font-bold text-white mb-1">Stars Don&apos;t Mean Active</div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                GitHub stars accumulate over years like museum plaques. A 40,000-star project might not have reviewed a community pull request in months.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.1] font-mono text-[11px] text-zinc-300">
              Total stars vs. active review speed
            </div>
          </div>

          <div className="rounded-3xl glass-panel p-7 border border-white/[0.1] shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-center text-emerald-600 mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="font-space text-2xl font-bold text-white mb-1">The GetMerged Solution</div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                We track live GitHub pull requests, review response times, and newcomer merge rates so you can contribute with confidence.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.1] font-mono text-[11px] text-zinc-300">
              Real GitHub review metrics
            </div>
          </div>
        </div>

        {/* The 9 Macro Signals */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-white/[0.1] pb-4">
            <h2 className="text-2xl font-bold font-space text-white">
              The 9 Signals We Check
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1">
              Every repository is continuously benchmarked against other projects in the same programming language ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {telemetryPillars.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="rounded-2xl glass-panel p-6 sm:p-7 border border-white/[0.1] shadow-xs hover:border-white/[0.12] transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-5"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-zinc-300">0{idx + 1}</span>
                        <h3 className="font-space text-lg font-bold text-white">
                          {item.name}
                        </h3>
                      </div>
                      <p className="text-sm font-semibold text-zinc-200 font-sans mb-1.5">
                        {item.headline}
                      </p>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 font-mono pl-15 sm:pl-0">
                    <span className="inline-block px-2.5 py-1 rounded-lg glass-card border border-white/[0.1] text-zinc-300 text-xs font-semibold">
                      {item.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* C-Rank Multi-Factor Telemetry Signals Table */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-white/[0.1] pb-4">
            <h2 className="text-2xl font-bold font-space text-white">
              How Each Metric Is Calculated
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1">
              Clear, objective metrics calculated directly from public GitHub pull requests and review activity.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl glass-panel border border-white/[0.1] shadow-xs">
            <table className="w-full text-left text-xs text-zinc-300 font-sans">
              <thead className="bg-[#141414] text-zinc-200 border-b border-white/[0.1] font-semibold font-space uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-5">Metric</th>
                  <th className="py-3.5 px-4 text-center font-mono">Priority</th>
                  <th className="py-3.5 px-4 font-mono">Timeframe</th>
                  <th className="py-3.5 px-5">Why It Matters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08] font-sans">
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">1. External PR Merge Rate</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                      Primary
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">180-Day Rolling</td>
                  <td className="py-3.5 px-5 text-zinc-300">Ratio of merged vs. closed outside community PRs (excludes automated bot merges).</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">2. Initial Review Response Turnaround</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-blue-950/80 text-blue-300 border border-blue-500/30">
                      High Impact
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">Recent PRs</td>
                  <td className="py-3.5 px-5 text-zinc-300">Median hours before a human maintainer posts an actionable review.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">3. Maintainer Commit &amp; Merge Recency</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/30">
                      High Impact
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">Active Window</td>
                  <td className="py-3.5 px-5 text-zinc-300">Ensures the core maintainers are currently active on the repository.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">4. First-Timer Contributor Success</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                      Hospitality
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">New Authors</td>
                  <td className="py-3.5 px-5 text-zinc-300">Acceptance rate and constructive feedback for developers opening their very first PR.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">5. Time to Merge (Land Velocity)</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                      Velocity
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">Merged PRs</td>
                  <td className="py-3.5 px-5 text-zinc-300">Total hours from opening a pull request to getting merged into main.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">6. Repeat Contributor Retention</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                      Community
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">Past Year</td>
                  <td className="py-3.5 px-5 text-zinc-300">Percentage of outside contributors who return to open a second or third PR.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">7. Review Cycle Efficiency</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-orange-950/80 text-orange-300 border border-orange-500/30">
                      Efficiency
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">Per PR</td>
                  <td className="py-3.5 px-5 text-zinc-300">Rewards consolidated, clear feedback rounds without dragged-out review churn.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">8. Review Team Size &amp; Breadth</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-rose-950/80 text-rose-300 border border-rose-500/30">
                      Team Health
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">90-Day Active</td>
                  <td className="py-3.5 px-5 text-zinc-300">Multi-maintainer review coverage to prevent single-person bottlenecks.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">9. Issue &amp; Discussion Responsiveness</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                      Support
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">Issues</td>
                  <td className="py-3.5 px-5 text-zinc-300">Promptness and clarity when guiding prospective contributors on issues.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tier Classification Hierarchy */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-white/[0.1] pb-4">
            <h2 className="text-2xl font-bold font-space text-white">
              The C-Rank™ Hospitality Ladder
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1">
              Know what to expect before you write a single line of code.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tiers.map((t) => (
              <div
                key={t.tier}
                className="rounded-2xl glass-panel p-6 border border-white/[0.1] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-4 flex-1">
                  <div className={`px-3 py-1.5 rounded-xl font-mono text-sm font-bold border shrink-0 flex items-center gap-2 ${t.badgeClass}`}>
                    <span className={`h-2 w-2 rounded-full ${t.indicatorColor}`} />
                    <span>{t.label} ({t.tier})</span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
                    {t.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-3xl glass-card text-white p-8 sm:p-12 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold font-space">
              Find your next open door today
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 mt-2 font-sans">
              Stop guessing which repos will merge your PRs. Browse repositories with verified maintainer pulse.
            </p>
          </div>
          <Link
            href="/"
            title="Explore Open Source Repositories on GetMerged"
            className="inline-flex items-center gap-2 rounded-xl glass-panel px-6 py-3 font-sans text-xs font-bold text-white hover:glass-card active:scale-95 transition-all shadow-xs shrink-0"
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
