"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { Eyebrow, HomeSection } from "./HomeSection";

const SCORE_ROWS: Array<{ label: string; badge: string; badgeClass: string }> = [
  { label: "External PR Merge Rate", badge: "Primary", badgeClass: "text-[#10b981]" },
  { label: "Review Response Time", badge: "Core", badgeClass: "text-[#38bdf8]" },
  { label: "Recent Commit Activity", badge: "Core", badgeClass: "text-[#c084fc]" },
  { label: "First-Timer Onboarding", badge: "Hospitality", badgeClass: "text-[#fbbf24]" },
];

/** C-Rank scoring factors section. */
export function ScoreFactors() {
  return (
    <HomeSection className="py-12">
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        {/* Left: Factor list */}
        <div className="bg-[#141414] border border-white/[0.08] rounded-xl p-6 space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center text-[#a3a3a3] border-b border-white/[0.08] pb-3">
            <span>How We Score Repositories</span>
            <span className="text-[#10b981] font-bold">Continuous</span>
          </div>
          <div className="space-y-2">
            {SCORE_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center bg-[#0a0a0a] p-2.5 rounded-lg border border-white/[0.04]"
              >
                <span className="text-[#a3a3a3]">{row.label}</span>
                <span className={`${row.badgeClass} font-bold`}>{row.badge}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Description */}
        <div className="space-y-4">
          <Eyebrow className="text-[#38bdf8]">
            <Sparkles className="h-3.5 w-3.5" /> Transparent Metrics
          </Eyebrow>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight font-sans">
            9 real signals. Zero guesswork.
          </h2>
          <p className="text-sm text-[#a3a3a3] font-sans leading-relaxed">
            GetMerged tracks active pull requests across 20+ programming languages - measuring real review turnaround, newcomer acceptance, and maintainer responsiveness.
          </p>
          <Link
            href="/how-c-rank-works"
            title="Learn how GetMerged scores repositories"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1c1c1c] border border-white/[0.08] px-5 py-2.5 font-sans text-xs font-semibold text-white hover:bg-[#262626] hover:border-white/[0.16] transition-all"
          >
            <span>See how scoring works</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>
    </HomeSection>
  );
}
