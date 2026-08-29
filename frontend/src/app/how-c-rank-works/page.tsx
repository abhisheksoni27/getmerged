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
      color: "text-emerald-400 bg-emerald-950/60 border-emerald-500/30",
      headline: "Are outside submissions welcomed into main?",
      desc: "Measures whether non-maintainer community code actually reaches production. Filters out internal bot merges, automated dependencies, and core-team-only branches.",
    },
    {
      name: "Reviewer Response Turnaround",
      priority: "Velocity Core",
      icon: Clock,
      color: "text-blue-400 bg-blue-950/60 border-blue-500/30",
      headline: "The 24-Hour Momentum Window",
      desc: "Calculates the median hours before a human reviewer leaves an actionable reply. PRs that wait more than 7 days have an 80% higher abandon rate.",
    },
    {
      name: "Commit Pulse & Recency",
      priority: "Freshness Signal",
      icon: Activity,
      color: "text-purple-400 bg-purple-950/60 border-purple-500/30",
      headline: "Active Heartbeat vs. Dormant Giant",
      desc: "Monitors active commit rhythms across a rolling 180-day window, ensuring you never write code for a project whose maintainers stepped away months ago.",
    },
    {
      name: "First-Timer Contributor Success",
      priority: "Hospitality Metric",
      icon: ShieldCheck,
      color: "text-amber-400 bg-amber-950/60 border-amber-500/30",
      headline: "Do new authors receive constructive onboarding?",
      desc: "Specifically evaluates developers opening their first pull request. Separates patient, mentorship-driven teams from insular, gatekept codebases.",
    },
    {
      name: "Resolution & Land Velocity",
      priority: "Velocity Metric",
      icon: Zap,
      color: "text-indigo-400 bg-indigo-950/60 border-indigo-500/30",
      headline: "Speed to final merge without infinite rebasing",
      desc: "Tracks total hours from initial opening to merged commit, preventing the dreaded weeks-long cycle of repeated merge-conflict resolution.",
    },
    {
      name: "Repeat Contributor Retention",
      priority: "Culture Signal",
      icon: Repeat,
      color: "text-cyan-400 bg-cyan-950/60 border-cyan-500/30",
      headline: "Do contributors return for PR #2 and #3?",
      desc: "Measures whether outside developers enjoy their first experience enough to stay and contribute regularly. The ultimate proof of healthy maintainer empathy.",
    },
    {
      name: "Review Cycle Density",
      priority: "Friction Signal",
      icon: HelpCircle,
      color: "text-orange-400 bg-orange-950/60 border-orange-500/30",
      headline: "Clear, consolidated guidance vs. endless nitpicks",
      desc: "Analyzes comment patterns per merged pull request to reward consolidated, respectful review rounds over fragmented multi-week review churn.",
    },
    {
      name: "Maintainer Core Distribution",
      priority: "Bus-Factor Metric",
      icon: Users,
      color: "text-rose-400 bg-rose-950/60 border-rose-500/30",
      headline: "Multi-maintainer review cores",
      desc: "Evaluates the number of active distinct reviewers. Projects with distributed review teams avoid single-maintainer bottlenecks and burnout freezes.",
    },
    {
      name: "Issue & Discussion Triage",
      priority: "Community Health",
      icon: Sparkles,
      color: "text-emerald-400 bg-emerald-950/60 border-emerald-500/30",
      headline: "Proactive issue scoping and triaging",
      desc: "Tracks maintainer responsiveness on incoming issues and discussions to evaluate whether the project actively guides prospective contributors.",
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
            <DoorOpen className="h-3.5 w-3.5 text-amber-400" /> The Science of Open Source Hospitality
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-space text-white tracking-tight leading-tight">
            Why Millions of Pull Requests Become Zombie PRs
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-300 max-w-3xl leading-relaxed font-sans">
            Every day, thousands of enthusiastic developers clone a famous GitHub repository, spend late nights reading documentation, write comprehensive unit tests, and submit a pristine pull request.
          </p>
          <p className="mt-3 text-base text-zinc-300 max-w-3xl leading-relaxed font-sans font-medium">
            And then... silence. Weeks turn into months. The PR sits untouched until a merge conflict breaks it forever.
          </p>
        </div>

        {/* The Open Source Reality Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 font-sans">
          <div className="rounded-3xl glass-panel p-7 border border-white/[0.1] shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-center text-rose-600 mb-4">
                <HeartCrack className="h-5 w-5" />
              </div>
              <div className="font-space text-2xl font-bold text-white mb-1">60% Burnout Rate</div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Over 60% of open-source maintainers perform their work entirely unpaid and report overwhelming burnout from incoming backlog fatigue.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.1] font-mono text-[11px] text-zinc-300">
              Source: Maintainer Sustainability Surveys
            </div>
          </div>

          <div className="rounded-3xl glass-panel p-7 border border-white/[0.1] shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-center text-amber-600 mb-4">
                <Ghost className="h-5 w-5" />
              </div>
              <div className="font-space text-2xl font-bold text-white mb-1">The Star Illusion</div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                GitHub stars accumulate forever like museum plaques. A 40,000-star project could easily be an unmaintained ghost town today.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.1] font-mono text-[11px] text-zinc-300">
              Legacy stars vs. real maintainer pulse
            </div>
          </div>

          <div className="rounded-3xl glass-panel p-7 border border-white/[0.1] shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-center text-emerald-600 mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="font-space text-2xl font-bold text-white mb-1">The GetMerged Fix</div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                We analyze live GraphQL event streams to pinpoint repos where maintainers are active, responsive, and genuinely excited to merge community code.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.1] font-mono text-[11px] text-zinc-300">
              Objective maintainer telemetry
            </div>
          </div>
        </div>

        {/* The 9 Macro Signals */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-white/[0.1] pb-4">
            <h2 className="text-2xl font-bold font-space text-white">
              The 9 Telemetry Signals We Monitor
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1">
              Every repository is continuously benchmarked against peer projects in the same programming ecosystem.
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
              C-Rank™ Multi-Factor Telemetry Model
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1">
              Deterministic, continuous scoring calculated from multi-dimensional GitHub GraphQL telemetry.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl glass-panel border border-white/[0.1] shadow-xs">
            <table className="w-full text-left text-xs text-zinc-300 font-sans">
              <thead className="bg-[#141414] text-zinc-200 border-b border-white/[0.1] font-semibold font-space uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-5">Telemetry Factor</th>
                  <th className="py-3.5 px-4 text-center font-mono">Impact Priority</th>
                  <th className="py-3.5 px-4 font-mono">Telemetry Scope</th>
                  <th className="py-3.5 px-5">Evaluation Focus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08] font-sans">
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">1. External PR Merge Velocity</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                      Primary
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">180-Day Rolling</td>
                  <td className="py-3.5 px-5 text-zinc-300">Ratio of merged vs. abandoned external (non-bot) community pull requests.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">2. Initial Review Response Turnaround</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-blue-950/80 text-blue-300 border border-blue-500/30">
                      High Impact
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">Recent PRs</td>
                  <td className="py-3.5 px-5 text-zinc-300">Median hours before a human maintainer posts an actionable, constructive review.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">3. Maintainer Commit &amp; Merge Recency</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/30">
                      High Impact
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">Rolling Pulse</td>
                  <td className="py-3.5 px-5 text-zinc-300">Continuous commit rhythm and recency of active maintainer participation.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">4. First-Timer Contributor Success</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                      Core Hospitality
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">New Authors</td>
                  <td className="py-3.5 px-5 text-zinc-300">Acceptance rate and onboarding assistance for authors opening their first PR.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">5. Resolution &amp; Land Velocity</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                      Core Velocity
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">Merged PRs</td>
                  <td className="py-3.5 px-5 text-zinc-300">Total cycle duration from initial PR opening to final main-branch merge.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">6. Repeat Contributor Retention</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                      Culture Signal
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">Cohorts</td>
                  <td className="py-3.5 px-5 text-zinc-300">Percentage of outside developers returning for subsequent contributions.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">7. Review Friction &amp; Cycle Density</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-orange-950/80 text-orange-300 border border-orange-500/30">
                      Friction Factor
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">Per PR</td>
                  <td className="py-3.5 px-5 text-zinc-300">Efficient feedback rounds without multi-week fragmented review delays.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">8. Maintainer Breadth &amp; Bus Factor</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-rose-950/80 text-rose-300 border border-rose-500/30">
                      Safety Gate
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">90-Day Active</td>
                  <td className="py-3.5 px-5 text-zinc-300">Multi-maintainer bench depth; single-maintainer bottlenecks cap score.</td>
                </tr>
                <tr className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white font-space">9. Issue &amp; Discussion Triage</td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                      Community Support
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">Issues</td>
                  <td className="py-3.5 px-5 text-zinc-300">Promptness and clarity when triaging prospective contributor questions.</td>
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
