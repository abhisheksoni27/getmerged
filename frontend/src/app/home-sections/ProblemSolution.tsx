"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Eyebrow, HomeSection } from "./HomeSection";

/** Problem-Solution split layout: stars vs active maintainers. */
export function ProblemSolution() {
  return (
    <HomeSection className="py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Problem statement */}
        <div className="space-y-4">
          <Eyebrow>
            <Star className="h-3.5 w-3.5 fill-black text-black" /> Beyond GitHub Stars
          </Eyebrow>
          <h2 className="text-2xl sm:text-4xl font-black text-black tracking-tight leading-tight font-display uppercase">
            Stars measure popularity. C-Rank measures active maintainers.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-800 font-mono leading-relaxed">
            A repository with 40,000 stars might have unanswered PRs from months ago. When you pick projects by stars alone, you often run into backlogged, exhausted teams. GetMerged checks whether maintainers are actually reviewing and merging community pull requests today.
          </p>
          <Link prefetch={false}
            href="/how-c-rank-works"
            title="Learn how GetMerged scores open source projects"
            className="inline-flex items-center gap-2 text-xs font-mono font-black uppercase border-2 border-black bg-white px-4 py-2 text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FACC15] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            <span>See how scoring works</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Right: Live activity contrast */}
        <div className="bg-white border-2 border-black rounded-none p-6 sm:p-7 shadow-[4px_4px_0px_0px_#000] space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <span className="text-black font-black uppercase tracking-wider">Real GitHub Activity</span>
            <span className="bg-[#10B981] text-black border-2 border-black px-2 py-0.5 font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_#000]">Live Data</span>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-none bg-[#FFFDF8] border-2 border-black border-l-8 border-l-[#EF4444] shadow-[2px_2px_0px_0px_#000]">
              <div className="flex justify-between text-black font-bold uppercase mb-1">
                <span>Backlogged Repository</span>
                <span className="bg-[#EF4444] text-white px-1 font-mono text-[11px] font-black">45k ★</span>
              </div>
              <div className="text-xs text-neutral-700 font-mono leading-relaxed">
                Median PR review wait: <strong className="text-[#EF4444] font-black">140+ days</strong>
              </div>
            </div>
            <div className="p-4 rounded-none bg-[#FFFDF8] border-2 border-black border-l-8 border-l-[#10B981] shadow-[2px_2px_0px_0px_#000]">
              <div className="flex justify-between text-black font-bold uppercase mb-1">
                <span>Active &amp; Welcoming Repo</span>
                <span className="bg-[#10B981] text-black px-1 font-mono text-[11px] font-black">1.8k ★</span>
              </div>
              <div className="text-xs text-neutral-700 font-mono leading-relaxed">
                Median PR review wait: <strong className="text-[#10B981] font-black">&lt;6 hours</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HomeSection>
  );
}
