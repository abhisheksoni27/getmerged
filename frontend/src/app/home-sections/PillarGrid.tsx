"use client";

import Link from "next/link";
import { Activity, ArrowRight, GitPullRequest, Sparkles } from "lucide-react";

/** 3-Pillar Platform Interlinking Grid */
export function PillarGrid() {
  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto text-left">
      {/* Pillar 1: Contributors & PR Tracking */}
      <Link prefetch={false}
        href="/dashboard"
        className="p-5 rounded-xl border border-white/[0.1] bg-[#141414]/90 hover:bg-[#1c1c1c] hover:border-emerald-500/40 transition-all group flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              For Contributors
            </span>
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
            Track Open PRs & Forecasts
          </h3>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-sans">
            Real-time review velocity alerts, merge probability scores, and contributor onboarding quests.
          </p>
        </div>
        <div className="mt-4 flex items-center text-xs font-mono font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
          <span>Open Dashboard</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </div>
      </Link>

      {/* Pillar 2: For Maintainers */}
      <Link prefetch={false}
        href="/maintainers"
        className="p-5 rounded-xl border border-white/[0.1] bg-[#141414]/90 hover:bg-[#1c1c1c] hover:border-amber-500/40 transition-all group flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              For Maintainers
            </span>
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
            Claim Repo & Boost Turnaround
          </h3>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-sans">
            Claim your C-Rank scorecard, embed review SLAs, and attract high-quality beginner PRs.
          </p>
        </div>
        <div className="mt-4 flex items-center text-xs font-mono font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
          <span>Maintainer Console</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </div>
      </Link>

      {/* Pillar 3: Good First Issues & Stack */}
      <Link prefetch={false}
        href="/good-first-issue"
        className="p-5 rounded-xl border border-white/[0.1] bg-[#141414]/90 hover:bg-[#1c1c1c] hover:border-blue-500/40 transition-all group flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
              Beginner Friendly
            </span>
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
            Good First Issues
          </h3>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-sans">
            Curated, active beginner issues ranked by maintainer responsiveness and real merge probability.
          </p>
        </div>
        <div className="mt-4 flex items-center text-xs font-mono font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
          <span>Explore Issues</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </div>
      </Link>
    </div>
  );
}
