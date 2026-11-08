"use client";

import Link from "next/link";
import { Activity, ArrowRight, GitPullRequest, Sparkles } from "lucide-react";

/** 3-Pillar Platform Interlinking Grid - Clean Architectural Panels */
export function PillarGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto text-left">
      {/* Pillar 1: Contributors & PR Tracking */}
      <Link prefetch={false}
        href="/dashboard"
        className="card p-6 sm:p-7 group flex flex-col justify-between hover:border-[var(--border-strong)] transition-all cursor-pointer"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-[#04060A] text-[var(--purple-bright)] border border-[var(--border-subtle)]">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <span className="pill pill-green">
              For Contributors
            </span>
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] font-display tracking-tight group-hover:text-[var(--purple-bright)] transition-colors">
            Track Open PRs &amp; Forecasts
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed font-sans">
            Real-time review velocity alerts, merge probability scores, and contributor onboarding quests.
          </p>
        </div>
        <div className="mt-5 flex items-center text-xs font-mono text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-all">
          <span>Open Dashboard</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>

      {/* Pillar 2: For Maintainers */}
      <Link prefetch={false}
        href="/maintainers"
        className="card p-6 sm:p-7 group flex flex-col justify-between hover:border-[var(--border-strong)] transition-all cursor-pointer"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-[#04060A] text-[var(--green-bright)] border border-[var(--border-subtle)]">
              <Activity className="h-5 w-5" />
            </div>
            <span className="pill pill-purple">
              For Maintainers
            </span>
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] font-display tracking-tight group-hover:text-[var(--purple-bright)] transition-colors">
            Claim Repo &amp; Boost Turnaround
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed font-sans">
            Claim your C-Rank scorecard, embed review SLAs, and attract high-quality beginner PRs.
          </p>
        </div>
        <div className="mt-5 flex items-center text-xs font-mono text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-all">
          <span>Maintainer Console</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>

      {/* Pillar 3: Good First Issues & Stack */}
      <Link prefetch={false}
        href="/good-first-issue"
        className="card p-6 sm:p-7 group flex flex-col justify-between hover:border-[var(--border-strong)] transition-all cursor-pointer"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-[#04060A] text-amber-400 border border-[var(--border-subtle)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="pill pill-amber">
              Beginner Friendly
            </span>
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] font-display tracking-tight group-hover:text-[var(--purple-bright)] transition-colors">
            Good First Issues
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed font-sans">
            Curated, active beginner issues ranked by maintainer responsiveness and real merge probability.
          </p>
        </div>
        <div className="mt-5 flex items-center text-xs font-mono text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-all">
          <span>Explore Issues</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>
    </div>
  );
}
