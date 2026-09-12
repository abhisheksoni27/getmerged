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
          <Eyebrow className="text-[#ff6b00]">
            <Star className="h-3.5 w-3.5 fill-[#ff6b00]" /> Beyond GitHub Stars
          </Eyebrow>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight font-sans">
            Stars measure popularity. C-Rank measures active maintainers.
          </h2>
          <p className="text-sm text-[#a3a3a3] font-sans leading-relaxed">
            A repository with 40,000 stars might have unanswered PRs from months ago. When you pick projects by stars alone, you often run into backlogged, exhausted teams. GetMerged checks whether maintainers are actually reviewing and merging community pull requests today.
          </p>
          <Link
            href="/how-c-rank-works"
            title="Learn how GetMerged scores open source projects"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-white hover:text-[#a3a3a3] transition-colors"
          >
            <span>See how scoring works</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Right: Live activity contrast */}
        <div className="bg-[#141414] border border-white/[0.08] rounded-xl p-6 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <span className="text-[#a3a3a3]">Real GitHub Activity</span>
            <span className="text-[#10b981] font-bold">Live Data</span>
          </div>
          <div className="space-y-3">
            <div className="p-3.5 rounded-lg bg-[#0a0a0a] border border-[#f87171]/30">
              <div className="flex justify-between text-[#d4d4d4] font-bold mb-1">
                <span>Backlogged Repository</span>
                <span className="text-[#f87171]">45k ★</span>
              </div>
              <div className="text-[11px] text-[#a3a3a3] font-sans leading-relaxed">
                Median PR review wait: <strong className="text-[#f87171]">140+ days</strong>
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#0a0a0a] border border-[#10b981]/30">
              <div className="flex justify-between text-[#d4d4d4] font-bold mb-1">
                <span>Active &amp; Welcoming Repo</span>
                <span className="text-[#10b981]">1.8k ★</span>
              </div>
              <div className="text-[11px] text-[#a3a3a3] font-sans leading-relaxed">
                Median PR review wait: <strong className="text-[#10b981]">&lt;6 hours</strong>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </HomeSection>
  );
}
