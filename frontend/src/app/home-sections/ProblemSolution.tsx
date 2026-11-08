"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Eyebrow, HomeSection } from "./HomeSection";

/** Problem-Solution split layout: stars vs active maintainers. */
export function ProblemSolution() {
  return (
    <HomeSection className="py-16 sm:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        {/* Left: Problem statement */}
        <div className="space-y-5">
          <Eyebrow>
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" /> Beyond GitHub Stars
          </Eyebrow>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight leading-tight font-sans">
            Stars measure popularity.<br /><span className="text-[var(--purple-bright)]">C-Rank measures active maintainers.</span>
          </h2>
          <p className="text-base text-[var(--text-secondary)] font-sans leading-relaxed">
            A repository with 40,000 stars might have unanswered PRs from months ago. When you pick projects by stars alone, you often run into backlogged, exhausted teams. GetMerged checks whether maintainers are actually reviewing and merging community pull requests today.
          </p>
          <Link prefetch={false}
            href="/how-c-rank-works"
            title="Learn how GetMerged scores open source projects"
            className="inline-flex items-center gap-2 rounded-lg bg-[#21262D] border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[#30363D] px-5 py-2.5 text-sm font-medium transition-colors font-mono"
          >
            <span>See how scoring works</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Right: Live activity contrast */}
        <div className="bg-[rgba(17,24,39,0.7)] border border-[var(--border-subtle)] rounded-xl p-7 sm:p-8 shadow-xs space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-primary)] font-semibold text-sm">Real GitHub Activity Telemetry</span>
            <span className="bg-[rgba(63,185,80,0.15)] text-[var(--green-bright)] border border-[rgba(63,185,80,0.3)] px-2.5 py-0.5 rounded-full font-mono text-xs font-medium">Live Telemetry</span>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-[#0D111A] border border-[rgba(248,81,73,0.3)]">
              <div className="flex justify-between items-center text-[var(--text-primary)] font-medium text-sm mb-1.5">
                <span>Backlogged Giant Repository</span>
                <span className="bg-[rgba(248,81,73,0.15)] text-[#F85149] px-2 py-0.5 rounded-md font-mono text-xs font-semibold">45k ★</span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                Median PR review wait: <strong className="text-[#F85149] font-semibold">140+ days</strong> (72% closed unmerged)
              </div>
            </div>
            <div className="p-4 rounded-lg bg-[#0D111A] border border-[rgba(63,185,80,0.3)]">
              <div className="flex justify-between items-center text-[var(--text-primary)] font-medium text-sm mb-1.5">
                <span>Active &amp; Welcoming Hidden Gem</span>
                <span className="bg-[rgba(63,185,80,0.15)] text-[var(--green-bright)] px-2 py-0.5 rounded-md font-mono text-xs font-semibold">1.8k ★</span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                Median PR review wait: <strong className="text-[var(--green-bright)] font-semibold">&lt; 4 hours</strong> (86% merged)
              </div>
            </div>
          </div>
        </div>
      </div>
    </HomeSection>
  );
}
