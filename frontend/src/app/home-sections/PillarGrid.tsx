"use client";

import Link from "next/link";
import { Activity, ArrowRight, GitPullRequest, Sparkles } from "lucide-react";

/** 3-Pillar Platform Interlinking Grid - Industrial Neo-Brutalist Panels */
export function PillarGrid() {
  return (
    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
      {/* Pillar 1: Contributors & PR Tracking */}
      <Link prefetch={false}
        href="/dashboard"
        className="p-6 sm:p-7 rounded-none border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000] transition-all group flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-none bg-[#FFFDF8] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono font-black uppercase text-black bg-[#10B981] border-2 border-black px-2 py-0.5 shadow-[2px_2px_0px_0px_#000]">
              For Contributors
            </span>
          </div>
          <h3 className="text-lg font-black text-black font-display uppercase tracking-tight group-hover:text-[#2563EB] transition-colors">
            Track Open PRs & Forecasts
          </h3>
          <p className="text-xs text-neutral-800 mt-2 leading-relaxed font-mono">
            Real-time review velocity alerts, merge probability scores, and contributor onboarding quests.
          </p>
        </div>
        <div className="mt-6 flex items-center text-xs font-mono font-black uppercase text-black group-hover:translate-x-1 transition-transform">
          <span>Open Dashboard</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>

      {/* Pillar 2: For Maintainers */}
      <Link prefetch={false}
        href="/maintainers"
        className="p-6 sm:p-7 rounded-none border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000] transition-all group flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-none bg-[#FFFDF8] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono font-black uppercase text-black bg-[#FACC15] border-2 border-black px-2 py-0.5 shadow-[2px_2px_0px_0px_#000]">
              For Maintainers
            </span>
          </div>
          <h3 className="text-lg font-black text-black font-display uppercase tracking-tight group-hover:text-[#2563EB] transition-colors">
            Claim Repo & Boost Turnaround
          </h3>
          <p className="text-xs text-neutral-800 mt-2 leading-relaxed font-mono">
            Claim your C-Rank scorecard, embed review SLAs, and attract high-quality beginner PRs.
          </p>
        </div>
        <div className="mt-6 flex items-center text-xs font-mono font-black uppercase text-black group-hover:translate-x-1 transition-transform">
          <span>Maintainer Console</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>

      {/* Pillar 3: Good First Issues & Stack */}
      <Link prefetch={false}
        href="/good-first-issue"
        className="p-6 sm:p-7 rounded-none border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000] transition-all group flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-none bg-[#FFFDF8] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono font-black uppercase text-black bg-[#38BDF8] border-2 border-black px-2 py-0.5 shadow-[2px_2px_0px_0px_#000]">
              Beginner Friendly
            </span>
          </div>
          <h3 className="text-lg font-black text-black font-display uppercase tracking-tight group-hover:text-[#2563EB] transition-colors">
            Good First Issues
          </h3>
          <p className="text-xs text-neutral-800 mt-2 leading-relaxed font-mono">
            Curated, active beginner issues ranked by maintainer responsiveness and real merge probability.
          </p>
        </div>
        <div className="mt-6 flex items-center text-xs font-mono font-black uppercase text-black group-hover:translate-x-1 transition-transform">
          <span>Explore Issues</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>
    </div>
  );
}
