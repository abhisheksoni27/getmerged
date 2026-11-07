"use client";

import Link from "next/link";
import { Activity, ArrowRight, GitPullRequest, Sparkles } from "lucide-react";

/** 3-Pillar Platform Interlinking Grid - Clean Architectural Panels */
export function PillarGrid() {
  return (
    <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
      {/* Pillar 1: Contributors & PR Tracking */}
      <Link prefetch={false}
        href="/dashboard"
        className="p-7 sm:p-8 rounded-2xl border border-zinc-200/90 bg-white shadow-xs hover:border-zinc-300 hover:shadow-md transition-all group flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="p-2.5 rounded-xl bg-zinc-50 text-zinc-900 border border-zinc-200/80 shadow-2xs">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              For Contributors
            </span>
          </div>
          <h3 className="text-lg font-bold text-zinc-950 font-sans tracking-tight group-hover:text-blue-600 transition-colors">
            Track Open PRs & Forecasts
          </h3>
          <p className="text-sm text-zinc-500 mt-2.5 leading-relaxed font-sans">
            Real-time review velocity alerts, merge probability scores, and contributor onboarding quests.
          </p>
        </div>
        <div className="mt-6 flex items-center text-xs font-semibold text-zinc-900 group-hover:translate-x-1 transition-transform">
          <span>Open Dashboard</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>

      {/* Pillar 2: For Maintainers */}
      <Link prefetch={false}
        href="/maintainers"
        className="p-7 sm:p-8 rounded-2xl border border-zinc-200/90 bg-white shadow-xs hover:border-zinc-300 hover:shadow-md transition-all group flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="p-2.5 rounded-xl bg-zinc-50 text-zinc-900 border border-zinc-200/80 shadow-2xs">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
              For Maintainers
            </span>
          </div>
          <h3 className="text-lg font-bold text-zinc-950 font-sans tracking-tight group-hover:text-blue-600 transition-colors">
            Claim Repo & Boost Turnaround
          </h3>
          <p className="text-sm text-zinc-500 mt-2.5 leading-relaxed font-sans">
            Claim your C-Rank scorecard, embed review SLAs, and attract high-quality beginner PRs.
          </p>
        </div>
        <div className="mt-6 flex items-center text-xs font-semibold text-zinc-900 group-hover:translate-x-1 transition-transform">
          <span>Maintainer Console</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>

      {/* Pillar 3: Good First Issues & Stack */}
      <Link prefetch={false}
        href="/good-first-issue"
        className="p-7 sm:p-8 rounded-2xl border border-zinc-200/90 bg-white shadow-xs hover:border-zinc-300 hover:shadow-md transition-all group flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="p-2.5 rounded-xl bg-zinc-50 text-zinc-900 border border-zinc-200/80 shadow-2xs">
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <span className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
              Beginner Friendly
            </span>
          </div>
          <h3 className="text-lg font-bold text-zinc-950 font-sans tracking-tight group-hover:text-blue-600 transition-colors">
            Good First Issues
          </h3>
          <p className="text-sm text-zinc-500 mt-2.5 leading-relaxed font-sans">
            Curated, active beginner issues ranked by maintainer responsiveness and real merge probability.
          </p>
        </div>
        <div className="mt-6 flex items-center text-xs font-semibold text-zinc-900 group-hover:translate-x-1 transition-transform">
          <span>Explore Issues</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>
    </div>
  );
}
