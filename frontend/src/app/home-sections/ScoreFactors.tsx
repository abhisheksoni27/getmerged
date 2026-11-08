"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Eyebrow, HomeSection } from "./HomeSection";

const SCORE_ROWS: Array<{ label: string; badge: string; badgeClass: string }> = [
  { label: "External PR Merge Rate", badge: "Primary", badgeClass: "text-[#0D9668]" },
  { label: "Review Response Time", badge: "Core", badgeClass: "text-[#2D8ABF]" },
  { label: "Recent Commit Activity", badge: "Core", badgeClass: "text-[#8B6BB5]" },
  { label: "First-Timer Onboarding", badge: "Hospitality", badgeClass: "text-[#C4910A]" },
];

/** C-Rank scoring factors section. */
export function ScoreFactors() {
  return (
    <HomeSection className="py-16 sm:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        {/* Left: Factor list */}
        <div className="bg-[rgba(17,24,39,0.7)] border border-[var(--border-subtle)] rounded-xl p-7 sm:p-8 shadow-xs space-y-4 backdrop-blur-md">
          <div className="flex justify-between items-center text-[var(--text-primary)] pb-3 border-b border-[var(--border-subtle)]">
            <span className="font-sans font-semibold text-sm">How We Score Repositories</span>
            <span className="bg-[rgba(63,185,80,0.15)] text-[var(--green-bright)] border border-[rgba(63,185,80,0.3)] px-2.5 py-0.5 rounded-full font-mono text-xs font-medium">Continuous Telemetry</span>
          </div>
          <div className="space-y-2.5">
            {SCORE_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center bg-[#0D111A] p-3.5 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-colors"
              >
                <span className="text-[var(--text-primary)] font-medium text-sm">{row.label}</span>
                <span className="font-mono text-xs text-[var(--text-secondary)] bg-[#111827] border border-[var(--border-subtle)] px-2.5 py-0.5 rounded-md">{row.badge}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Description */}
        <div className="space-y-5">
          <Eyebrow>
            <Sparkles className="h-3.5 w-3.5 text-[var(--purple-bright)]" /> Transparent Metrics
          </Eyebrow>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight leading-tight font-sans">
            9 empirical signals.<br /><span className="text-[var(--purple-bright)]">Zero subjective guesswork.</span>
          </h2>
          <p className="text-base text-[var(--text-secondary)] font-sans leading-relaxed">
            GetMerged tracks active pull requests across 20+ programming languages - measuring real review turnaround, newcomer acceptance, and maintainer responsiveness with mandatory sample sizes.
          </p>
          <Link prefetch={false}
            href="/how-c-rank-works"
            title="Learn how GetMerged scores repositories"
            className="inline-flex items-center gap-2 rounded-lg bg-[#21262D] border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[#30363D] px-5 py-2.5 text-sm font-medium transition-colors font-mono"
          >
            <span>See how scoring works</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </HomeSection>
  );
}
