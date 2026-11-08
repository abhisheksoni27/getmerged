"use client";

import Link from "next/link";
import { Award, Briefcase, ShieldCheck, Sparkles, UserCheck, Zap } from "lucide-react";
import { PAYMENTS_ENABLED } from "@/lib/flags";

export function TalentHero() {
  return (
    <>
      {/* Hero Section */}
      <div className="rounded-3xl glass-panel border border-blue-500/30 p-8 sm:p-12 bg-gradient-to-br from-blue-950/40 via-zinc-950/90 to-zinc-900/50 shadow-2xl relative overflow-hidden text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold">
          <Briefcase className="h-4 w-4" />
          <span>WorkDone Database · For Technical Founders, CTOs & Engineering Leaders</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black font-space tracking-tight text-[var(--text-primary)] max-w-4xl mx-auto leading-tight">
          Stop Screening Resumes. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400">
            Hire the Engineers Who Built Your Tech Stack.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed font-sans">
          Resumes are full of self-reported claims. <strong>WorkDone Database</strong> is full of proof. Search senior software engineers indexed by actual pull requests merged into production open-source infrastructure.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-blue-400 font-mono text-xs font-semibold">
            <Sparkles className="h-4 w-4" />
            <span>Free Open Talent Directory</span>
          </div>
          <Link prefetch={false}
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl glass-panel border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-xs font-bold uppercase tracking-wider hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="h-4 w-4 text-emerald-400" />
            <span>Join Talent Pool (For Devs)</span>
          </Link>
        </div>
      </div>

      {/* 3 Core Value Props */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold font-space text-[var(--text-primary)]">
            1. Audited Code Proof
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
            Every candidate profile links to exact GitHub commits and merged PRs reviewed by core maintainers. No LeetCode trivia needed.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Award className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold font-space text-[var(--text-primary)]">
            2. Proof-of-Work Seniority
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
            Filter by verified Karma reputation. A Level 4+ engineer has proven merges across multiple Tier-S repositories.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold font-space text-[var(--text-primary)]">
            3. Direct Technical Outreach
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
            Connect directly founder-to-engineer with candidates who explicitly toggled <strong>&ldquo;Open to Opportunities&rdquo;</strong>.
          </p>
        </div>
      </div>
    </>
  );
}
