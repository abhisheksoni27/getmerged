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
    <HomeSection className="py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Factor list */}
        <div className="bg-white border-2 border-black rounded-none p-6 sm:p-7 shadow-[4px_4px_0px_0px_#000] space-y-4 font-mono text-xs">
          <div className="flex justify-between items-center text-black border-b-2 border-black pb-3">
            <span className="font-black uppercase tracking-wider">How We Score Repositories</span>
            <span className="bg-[#10B981] text-black border-2 border-black px-2 py-0.5 font-black uppercase text-[11px] shadow-[2px_2px_0px_0px_#000]">Continuous</span>
          </div>
          <div className="space-y-2.5">
            {SCORE_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center bg-[#FFFDF8] p-3 rounded-none border-2 border-black shadow-[2px_2px_0px_0px_#000]"
              >
                <span className="text-black font-bold uppercase tracking-tight">{row.label}</span>
                <span className="font-mono font-black text-black bg-neutral-200 border border-black px-2 py-0.5 uppercase text-[10px]">{row.badge}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Description */}
        <div className="space-y-4">
          <Eyebrow>
            <Sparkles className="h-3.5 w-3.5" /> Transparent Metrics
          </Eyebrow>
          <h2 className="text-2xl sm:text-4xl font-black text-black tracking-tight leading-tight font-display uppercase">
            9 real signals. Zero guesswork.
          </h2>
          <p className="text-sm sm:text-base text-neutral-800 font-mono leading-relaxed">
            GetMerged tracks active pull requests across 20+ programming languages - measuring real review turnaround, newcomer acceptance, and maintainer responsiveness.
          </p>
          <Link prefetch={false}
            href="/how-c-rank-works"
            title="Learn how GetMerged scores repositories"
            className="inline-flex items-center gap-2 rounded-none bg-black text-[#FACC15] hover:bg-[#FACC15] hover:text-black border-2 border-black px-5 py-2.5 font-mono text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <span>See how scoring works</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </HomeSection>
  );
}
