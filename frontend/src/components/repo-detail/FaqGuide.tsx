"use client";

import { Activity, FileCode2 } from "lucide-react";
import { Repo } from "@/types/opendoor";

interface FaqGuideProps {
  repo: Repo;
  fullName: string;
  rankLabel: string;
  score: number;
  responseTimeStr: string;
  mergeRateStr: string;
  firstTimerSuccessStr: string;
}

const FAQ_BADGES = [
  "border border-emerald-500/30 bg-emerald-500/15 font-mono text-xs font-bold text-emerald-300",
  "border border-orange-500/30 bg-orange-500/15 font-mono text-xs font-bold text-orange-300",
  "border border-pink-500/30 bg-pink-500/15 font-mono text-xs font-bold text-pink-300",
  "border border-amber-500/30 bg-amber-500/15 font-mono text-xs font-bold text-amber-300",
  "border border-cyan-500/30 bg-cyan-500/15 font-mono text-xs font-bold text-cyan-300",
] as const;

export function FaqGuide({
  repo,
  fullName,
  rankLabel,
  score,
  responseTimeStr,
  mergeRateStr,
  firstTimerSuccessStr,
}: FaqGuideProps) {
  const faqs = [
    {
      q: `Is ${fullName} welcoming to first-time open-source contributors?`,
      a: (
        <>
          {fullName} has a recorded first-timer success rate of <strong className="text-[var(--text-primary)]">{firstTimerSuccessStr}</strong>. Repositories ranked {rankLabel} typically provide actionable feedback during code reviews and actively nurture new community contributors.
        </>
      ),
    },
    {
      q: "How fast can I expect code review feedback on my pull request?",
      a: (
        <>
          The initial maintainer response time averages ~<strong className="text-[var(--text-primary)]">{responseTimeStr}</strong>. Keeping PRs scoped to single concerns and ensuring CI checks succeed will optimize review turnaround.
        </>
      ),
    },
    {
      q: `What does the ${score.toFixed(1)} C-Rank™ score represent?`,
      a: (
        <>
          The C-Rank™ index scores repositories on a 0 to 100 scale using an objective formula: external PR merge rates, initial response speed, active maintainer count, and first-time contributor retention. A score of {score.toFixed(1)} places {fullName} in the <strong className="text-[var(--text-primary)]">{rankLabel}</strong> tier.
        </>
      ),
    },
    {
      q: `What is the external contributor pull request merge rate for ${fullName}?`,
      a: (
        <>
          The external pull request merge rate is <strong className="text-[var(--text-primary)]">{mergeRateStr}</strong>. GetMerged isolates non-core community contributions so external developers get an accurate benchmark of PR acceptance probability.
        </>
      ),
    },
    {
      q: `Are there beginner Good First Issues open in ${fullName}?`,
      a: (repo?.good_first_issue_count || 0) > 0 ? (
        <>
          Yes, {fullName} currently has <strong className="text-[var(--text-primary)]">{repo?.good_first_issue_count}</strong> active issue(s) tagged with beginner-friendly labels. You can inspect these directly from the repository issues tab.
        </>
      ) : (
        <>
          {fullName} does not have open beginner labels indexed currently, but external PRs for bugs and documentation improvements are evaluated via normal issue triage.
        </>
      ),
    },
  ];

  return (
    <section id="faqs" className="scroll-mt-36 space-y-8 font-sans border-t-2 border-[var(--border-subtle)] pt-8 text-[var(--text-secondary)]">
      <section className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-5 sm:p-6 shadow-sm">
        <h2 className="text-base sm:text-lg font-extrabold font-space text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-sm rotate-2">
            <Activity className="h-4 w-4 text-emerald-400 shrink-0" />
          </span>
          {`Contributor Compatibility & Review Speed Analysis for ${fullName}`}
        </h2>
        <div className="rounded-xl border-2 border-[var(--border-subtle)] glass-panel p-4 text-[var(--text-secondary)] leading-relaxed max-w-none space-y-3 font-sans shadow-sm">
          <p>
            When evaluating whether to contribute to <strong className="text-[var(--text-primary)]">{fullName}</strong>, response velocity and maintainer engagement are crucial. GetMerged continuously tracks pull request trajectories, first-comment latency, and code review rounds to help developers avoid submitting pull requests to backlogged repositories.
          </p>
          <p>
            Currently, maintainers of {fullName} acknowledge new external contributions in approximately{" "}
            <strong className="text-[var(--text-primary)]">{responseTimeStr}</strong>. Out of all submitted pull requests from non-core authors in the last 180-day window,{" "}
            <strong className="text-[var(--text-primary)]">{mergeRateStr}</strong> were successfully merged into the primary branch.
          </p>
        </div>
      </section>

      <section className="content-auto rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-5 sm:p-6 rounded-2xl mb-8">
        <h2 className="text-base sm:text-lg font-extrabold font-space text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 shadow-sm -rotate-2">
            <FileCode2 className="h-4 w-4 text-sky-400 shrink-0" />
          </span>
          {`Frequently Asked Questions - Contributing to ${fullName}`}
        </h2>
        <div className="space-y-3.5">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border-2 border-[var(--border-subtle)] glass-panel p-4 shadow-sm">
              <div className="flex gap-3">
                <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md shadow-sm ${FAQ_BADGES[i % FAQ_BADGES.length]}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] font-space mb-1.5">
                    {faq.q}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 text-[var(--text-primary)] shadow-sm">
        <h2 className="text-xs font-space font-extrabold text-yellow-200 uppercase tracking-wider mb-2">
          GetMerged C-Rank™ Indexing Standard
        </h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
          All metrics displayed for {fullName} are automatically retrieved via the public GitHub API and recalculated daily. Insider pull requests submitted by repository owners or organization members are excluded from merge rate calculations to preserve objective external contributor statistics.
        </p>
      </section>
    </section>
  );
}
