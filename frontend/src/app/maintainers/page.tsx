import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "For Maintainers: Get Better Pull Requests & Highlight Good First Issues | GetMerged",
  description:
    "Claim your GitHub repository on GetMerged. Show contributors your preferred PR size, highlight open Good First Issues, and reduce code review friction.",
  openGraph: {
    title: "For Maintainers: Get Better Pull Requests & Highlight Good First Issues | GetMerged",
    description:
      "Claim your GitHub repository on GetMerged to highlight beginner issues and guide contributors to submit smaller, faster-to-review pull requests.",
    url: "https://getmerged.abhishekco.de/maintainers",
    siteName: "GetMerged",
  },
};

export default function MaintainersPage() {
  return (
    <div className="min-h-screen flex flex-col bg-transparent text-white font-sans dev-grid-pattern">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Hero Section */}
        <div className="rounded-3xl surface-base border border-emerald-500/30 p-8 sm:p-12 bg-gradient-to-br from-emerald-950/30 via-zinc-950/80 to-zinc-900/40 shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
            <ShieldCheck className="h-4 w-4" />
            <span>For Open Source Maintainers</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-space tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Tired of Low-Effort PRs? <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
              Attract Contributors Who Ship.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            GetMerged ranks repositories by maintainer health and pre-screens external pull requests.
            Claim your repository to broadcast verified Good First Issues, pin contribution guidelines,
            and monitor your review velocity.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link prefetch={false}
              href="/repos"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/60 cursor-pointer"
            >
              <Award className="h-4 w-4" />
              <span>Find & Claim Your Repo</span>
            </Link>
            <Link prefetch={false}
              href="/how-c-rank-works"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl surface-base border border-white/[0.14] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>How C-Rank Is Calculated</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 3 Pillars of Value */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-3xl surface-base border border-white/[0.08] bg-zinc-950/50 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-space text-[var(--text-primary)]">
              Zero Low-Effort PRs
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
              Contributors see your <strong>PR Size Sweet Spot</strong> and guidelines before submitting code.
              No more 1,000-line surprise refactors that break your build.
            </p>
          </div>

          <div className="p-7 rounded-3xl surface-base border border-white/[0.08] bg-zinc-950/50 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-space text-[var(--text-primary)]">
              Spotlight Good First Issues
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
              Broadcast your starter tasks directly to thousands of language-specific developers and
              subscribers actively hunting for tickets to solve.
            </p>
          </div>

          <div className="p-7 rounded-3xl surface-base border border-white/[0.08] bg-zinc-950/50 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-space text-[var(--text-primary)]">
              Funnel Telemetry
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
              Track your repository&apos;s p50/p90 review latency, external merge rate, and bus factor.
              Improve your score to reach Tier S status.
            </p>
          </div>
        </div>

        {/* Maintainer Checklist Banner */}
        <div className="p-8 rounded-3xl surface-base border border-[var(--border-subtle)] bg-gradient-to-r from-zinc-900/60 to-zinc-950/80 space-y-6">
          <h2 className="text-2xl font-bold font-space text-[var(--text-primary)]">
            What Happens When You Claim?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[var(--text-secondary)] font-sans">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Verified Maintainer badge displayed across your repository scorecards.</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Ability to pin high-priority cash bounty and beginner tasks to the top.</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Weekly digest spotlight featuring your repo to matched contributors.</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Direct feedback response console to interact with community reviews.</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
