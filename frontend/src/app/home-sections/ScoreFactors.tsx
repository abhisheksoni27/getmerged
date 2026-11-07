"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";
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
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        {/* Left: Factor list */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-7 shadow-sm space-y-4 font-mono text-xs">
          <div className="flex justify-between items-center text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-3">
            <span>How We Score Repositories</span>
            <span className="text-[#0D9668] font-bold">Continuous</span>
          </div>
          <div className="space-y-2.5">
            {SCORE_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-subtle)]"
              >
                <span className="text-[var(--text-primary)] font-medium">{row.label}</span>
                <span className={`${row.badgeClass} font-bold`}>{row.badge}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Description */}
        <div className="space-y-4">
          <Eyebrow className="text-[#2D8ABF]">
            <Sparkles className="h-3.5 w-3.5" /> Transparent Metrics
          </Eyebrow>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight font-display">
            9 real signals. Zero guesswork.
          </h2>
          <p className="text-base text-[var(--text-secondary)] font-sans leading-relaxed">
            GetMerged tracks active pull requests across 20+ programming languages - measuring real review turnaround, newcomer acceptance, and maintainer responsiveness.
          </p>
          <Link prefetch={false}
            href="/how-c-rank-works"
            title="Learn how GetMerged scores repositories"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] px-5 py-2.5 font-sans text-xs font-semibold hover:bg-[var(--color-neutral-800)] shadow-sm transition-all"
          >
            <span>See how scoring works</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>
    </HomeSection>
  );
}
