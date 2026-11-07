"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { Eyebrow, HomeSection } from "./HomeSection";

/** Problem-Solution split layout: stars vs active maintainers. */
export function ProblemSolution() {
  return (
    <HomeSection className="py-12">
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        {/* Left: Problem statement */}
        <div className="space-y-4">
          <Eyebrow className="text-[var(--color-primary)]">
            <Star className="h-3.5 w-3.5 fill-[var(--color-primary)]" /> Beyond GitHub Stars
          </Eyebrow>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight font-display">
            Stars measure popularity. C-Rank measures active maintainers.
          </h2>
          <p className="text-base text-[var(--text-secondary)] font-sans leading-relaxed">
            A repository with 40,000 stars might have unanswered PRs from months ago. When you pick projects by stars alone, you often run into backlogged, exhausted teams. GetMerged checks whether maintainers are actually reviewing and merging community pull requests today.
          </p>
          <Link prefetch={false}
            href="/how-c-rank-works"
            title="Learn how GetMerged scores open source projects"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[var(--color-primary)] hover:underline transition-colors"
          >
            <span>See how scoring works</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Right: Live activity contrast */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-7 shadow-sm space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <span className="text-[var(--text-secondary)]">Real GitHub Activity</span>
            <span className="text-[#0D9668] font-bold">Live Data</span>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[#C4463A]/30">
              <div className="flex justify-between text-[var(--text-primary)] font-bold mb-1">
                <span>Backlogged Repository</span>
                <span className="text-[#C4463A]">45k ★</span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                Median PR review wait: <strong className="text-[#C4463A]">140+ days</strong>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[#0D9668]/30">
              <div className="flex justify-between text-[var(--text-primary)] font-bold mb-1">
                <span>Active &amp; Welcoming Repo</span>
                <span className="text-[#0D9668]">1.8k ★</span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                Median PR review wait: <strong className="text-[#0D9668]">&lt;6 hours</strong>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </HomeSection>
  );
}
