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
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-7 sm:p-8 shadow-xs space-y-4">
          <div className="flex justify-between items-center text-zinc-900 pb-3 border-b border-zinc-100">
            <span className="font-sans font-semibold text-sm text-zinc-900">How We Score Repositories</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-sans text-xs font-medium">Continuous</span>
          </div>
          <div className="space-y-2.5">
            {SCORE_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center bg-zinc-50/80 p-3.5 rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors"
              >
                <span className="text-zinc-800 font-medium text-sm">{row.label}</span>
                <span className="font-mono text-xs text-zinc-600 bg-white border border-zinc-200 px-2.5 py-0.5 rounded-md shadow-2xs">{row.badge}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Description */}
        <div className="space-y-5">
          <Eyebrow>
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Transparent Metrics
          </Eyebrow>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-950 tracking-tight leading-tight font-sans">
            9 real signals.<br />Zero guesswork.
          </h2>
          <p className="text-base text-zinc-600 font-sans leading-relaxed">
            GetMerged tracks active pull requests across 20+ programming languages - measuring real review turnaround, newcomer acceptance, and maintainer responsiveness.
          </p>
          <Link prefetch={false}
            href="/how-c-rank-works"
            title="Learn how GetMerged scores repositories"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 px-5 py-2.5 text-sm font-medium transition-colors"
          >
            <span>See how scoring works</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </HomeSection>
  );
}
