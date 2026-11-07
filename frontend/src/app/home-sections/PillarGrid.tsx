"use client";

import Link from "next/link";
import { Activity, ArrowRight, GitPullRequest, Sparkles } from "lucide-react";

/** 3-Pillar Platform Interlinking Grid - Expansive Warm Editorial Cards */
export function PillarGrid() {
  return (
    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
      {/* Pillar 1: Contributors & PR Tracking */}
      <Link prefetch={false}
        href="/dashboard"
        className="p-7 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] hover:shadow-md transition-all group flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] text-[#0D9668] border border-[var(--border-subtle)]">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <span className="text-xs font-mono font-semibold text-[#0D9668] bg-[#0D9668]/10 px-2.5 py-1 rounded-full">
              For Contributors
            </span>
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[#0D9668] transition-colors">
            Track Open PRs & Forecasts
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed font-sans">
            Real-time review velocity alerts, merge probability scores, and contributor onboarding quests.
          </p>
        </div>
        <div className="mt-6 flex items-center text-xs font-mono font-semibold text-[#0D9668] group-hover:translate-x-1 transition-transform">
          <span>Open Dashboard</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>

      {/* Pillar 2: For Maintainers */}
      <Link prefetch={false}
        href="/maintainers"
        className="p-7 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] hover:shadow-md transition-all group flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] text-[var(--color-primary)] border border-[var(--border-subtle)]">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-xs font-mono font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-1 rounded-full">
              For Maintainers
            </span>
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
            Claim Repo & Boost Turnaround
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed font-sans">
            Claim your C-Rank scorecard, embed review SLAs, and attract high-quality beginner PRs.
          </p>
        </div>
        <div className="mt-6 flex items-center text-xs font-mono font-semibold text-[var(--color-primary)] group-hover:translate-x-1 transition-transform">
          <span>Maintainer Console</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>

      {/* Pillar 3: Good First Issues & Stack */}
      <Link prefetch={false}
        href="/good-first-issue"
        className="p-7 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] hover:shadow-md transition-all group flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] text-[#2D8ABF] border border-[var(--border-subtle)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xs font-mono font-semibold text-[#2D8ABF] bg-[#2D8ABF]/10 px-2.5 py-1 rounded-full">
              Beginner Friendly
            </span>
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[#2D8ABF] transition-colors">
            Good First Issues
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed font-sans">
            Curated, active beginner issues ranked by maintainer responsiveness and real merge probability.
          </p>
        </div>
        <div className="mt-6 flex items-center text-xs font-mono font-semibold text-[#2D8ABF] group-hover:translate-x-1 transition-transform">
          <span>Explore Issues</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>
    </div>
  );
}
