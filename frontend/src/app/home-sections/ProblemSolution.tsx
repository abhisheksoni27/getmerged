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
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-950 tracking-tight leading-tight font-sans">
            Stars measure popularity.<br />C-Rank measures active maintainers.
          </h2>
          <p className="text-base text-zinc-600 font-sans leading-relaxed">
            A repository with 40,000 stars might have unanswered PRs from months ago. When you pick projects by stars alone, you often run into backlogged, exhausted teams. GetMerged checks whether maintainers are actually reviewing and merging community pull requests today.
          </p>
          <Link prefetch={false}
            href="/how-c-rank-works"
            title="Learn how GetMerged scores open source projects"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 px-5 py-2.5 text-sm font-medium transition-colors"
          >
            <span>See how scoring works</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Right: Live activity contrast */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-7 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <span className="text-zinc-900 font-semibold text-sm">Real GitHub Activity</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-sans text-xs font-medium">Live Telemetry</span>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100">
              <div className="flex justify-between items-center text-zinc-900 font-medium text-sm mb-1.5">
                <span>Backlogged Repository</span>
                <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-mono text-xs font-semibold">45k ★</span>
              </div>
              <div className="text-xs text-zinc-600 font-sans leading-relaxed">
                Median PR review wait: <strong className="text-rose-700 font-semibold">140+ days</strong>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <div className="flex justify-between items-center text-zinc-900 font-medium text-sm mb-1.5">
                <span>Active &amp; Welcoming Repo</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-mono text-xs font-semibold">1.8k ★</span>
              </div>
              <div className="text-xs text-zinc-600 font-sans leading-relaxed">
                Median PR review wait: <strong className="text-emerald-700 font-semibold">&lt;6 hours</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HomeSection>
  );
}
