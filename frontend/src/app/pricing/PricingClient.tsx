"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Briefcase,
  GitPullRequest,
  Activity,
} from "lucide-react";

type AudienceTab = "contributors" | "recruiter" | "maintainers";

export default function PricingClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") as AudienceTab | null;

  const [activeTab, setActiveTab] = useState<AudienceTab>(
    initialTab && ["contributors", "recruiter", "maintainers"].includes(initialTab)
      ? initialTab
      : "contributors"
  );

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  useEffect(() => {
    const tabParam = searchParams.get("tab") as AudienceTab | null;
    if (tabParam && ["contributors", "recruiter", "maintainers"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleCheckout = (product: string, planCycle: "monthly" | "yearly") => {
    window.location.href = `https://checkout.dodopayments.com/buy/${product}?billing_cycle=${planCycle}`;
  };

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 space-y-10">
      {/* Audience Selector Tabs */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#141414] border border-white/[0.1] shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab("contributors")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
              activeTab === "contributors"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <GitPullRequest className="h-4 w-4" />
            <span>For Contributors</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recruiter")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
              activeTab === "recruiter"
                ? "bg-blue-600 text-white shadow-md shadow-blue-950/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>For Hiring Teams 💼</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("maintainers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
              activeTab === "maintainers"
                ? "bg-amber-600 text-white shadow-md shadow-amber-950/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>For Maintainers ⚡</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CONTRIBUTORS PRICING */}
      {activeTab === "contributors" && (
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              <span>For Open Source Contributors & Developers</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-space text-white tracking-tight mb-3">
              Stop Guessing. Get Your Pull Requests Merged.
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 font-sans leading-relaxed">
              Unlimited repository review velocity forecasts, live maintainer turnaround advice, and automated pre-flight checks.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-2 p-1 bg-[#141414] rounded-xl mt-6 border border-white/[0.1] font-mono text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  billingCycle === "monthly" ? "bg-white/[0.1] text-white shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === "yearly" ? "bg-white/[0.1] text-white shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                Annual Billing
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  Save 27%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Tier Card */}
            <div className="rounded-2xl glass-panel p-6 sm:p-8 border border-white/[0.1] shadow-sm flex flex-col justify-between font-sans">
              <div>
                <div className="flex items-center justify-between mb-2 font-mono">
                  <h2 className="text-lg font-bold text-white">Community Free</h2>
                  <span className="text-xs text-zinc-400 glass-card px-2 py-0.5 rounded">Forever</span>
                </div>
                <p className="text-xs text-zinc-400 mb-6">
                  Essential tools for exploring repository maintainer responsiveness and finding beginner issues.
                </p>

                <div className="text-3xl font-bold font-mono text-white mb-6">
                  $0 <span className="text-xs font-normal font-sans text-zinc-400">/ month</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300 mb-8">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Public C-Rank™ metrics (S to D Tier)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>3 PR Likelihood evaluations per month</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Interactive Good First Issues search</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Embeddable dynamic SVG README badges</span>
                  </li>
                </ul>
              </div>

              <button
                disabled
                className="w-full py-2.5 rounded-xl glass-card text-zinc-400 font-mono font-bold text-xs uppercase tracking-wider text-center"
              >
                Current Plan
              </button>
            </div>

            {/* Pro Contributor Card */}
            <div className="rounded-2xl glass-panel p-6 sm:p-8 border-2 border-emerald-500 shadow-xl shadow-emerald-950/20 flex flex-col justify-between relative font-sans">
              <div className="absolute -top-3 right-6 bg-emerald-500 text-black text-[11px] font-bold font-mono uppercase px-3 py-0.5 rounded-full shadow-sm">
                Most Popular
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 font-mono">
                  <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-emerald-400 fill-emerald-400" /> Pro Contributor
                  </h2>
                </div>
                <p className="text-xs text-zinc-300 mb-6">
                  Supercharge your open-source journey with unlimited signals and maintainer intelligence.
                </p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold font-mono text-white">
                    {billingCycle === "yearly" ? "$79" : "$9"}
                  </span>
                  <span className="text-xs font-sans text-zinc-400">
                    {billingCycle === "yearly" ? "/ year ($6.58/mo)" : "/ month"}
                  </span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300 mb-8">
                  <li className="flex items-center gap-2.5 font-medium text-white">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Unlimited PR Acceptance & Latency Forecasts</span>
                  </li>
                  <li className="flex items-center gap-2.5 font-medium text-white">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Maintainer Vibe Check & Uncensored PR Guidelines</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Monday Morning Personalized Issue Match Digest</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Unlimited Static Pre-Flight PR Evaluator runs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Contributor DNA badge & verified social card</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleCheckout("pdt_opendoor_pro", billingCycle)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-[0.98]"
              >
                <span>Upgrade to Pro Now</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: B2B HIRING & RECRUITER PASS */}
      {activeTab === "recruiter" && (
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold mb-4">
              <Briefcase className="h-3.5 w-3.5" />
              <span>For Engineering Leaders, Founders & Recruiters</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-space text-white tracking-tight mb-3">
              Stop Screening Resumes. Hire Verified Contributors.
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 font-sans leading-relaxed">
              Source software engineers with proven merge records in top audited open-source codebases.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-2 p-1 bg-[#141414] rounded-xl mt-6 border border-white/[0.1] font-mono text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  billingCycle === "monthly" ? "bg-white/[0.1] text-white shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === "yearly" ? "bg-white/[0.1] text-white shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                Annual Billing
                <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  Save 33%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Talent Search */}
            <div className="rounded-2xl glass-panel p-6 sm:p-8 border border-white/[0.1] shadow-sm flex flex-col justify-between font-sans">
              <div>
                <div className="flex items-center justify-between mb-2 font-mono">
                  <h2 className="text-lg font-bold text-white">Talent Search</h2>
                  <span className="text-xs text-zinc-400 glass-card px-2 py-0.5 rounded">Free</span>
                </div>
                <p className="text-xs text-zinc-400 mb-6">
                  Browse public candidate pool, view merged PR count and language proficiencies.
                </p>

                <div className="text-3xl font-bold font-mono text-white mb-6">
                  $0 <span className="text-xs font-normal font-sans text-zinc-400">/ month</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300 mb-8">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Public developer talent search directory</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Filter by primary programming language</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>View top merged repositories</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-zinc-500">
                    <span>Candidate direct contact details masked</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/talent"
                className="w-full py-2.5 rounded-xl glass-card text-zinc-300 font-mono font-bold text-xs uppercase tracking-wider text-center hover:bg-white/[0.08] transition-colors"
              >
                Browse Candidates →
              </Link>
            </div>

            {/* Recruiter Pass Card */}
            <div className="rounded-2xl glass-panel p-6 sm:p-8 border-2 border-blue-500 shadow-xl shadow-blue-950/20 flex flex-col justify-between relative font-sans">
              <div className="absolute -top-3 right-6 bg-blue-500 text-white text-[11px] font-bold font-mono uppercase px-3 py-0.5 rounded-full shadow-sm">
                B2B Recruiter
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 font-mono">
                  <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-blue-400" /> Recruiter Pass
                  </h2>
                </div>
                <p className="text-xs text-zinc-300 mb-6">
                  Direct outreach access to top 5% open-source engineers actively open to job opportunities.
                </p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold font-mono text-white">
                    {billingCycle === "yearly" ? "$390" : "$49"}
                  </span>
                  <span className="text-xs font-sans text-zinc-400">
                    {billingCycle === "yearly" ? "/ year ($32.50/mo)" : "/ month"}
                  </span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300 mb-8">
                  <li className="flex items-center gap-2.5 font-medium text-white">
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Direct candidate email & LinkedIn contact unlock</span>
                  </li>
                  <li className="flex items-center gap-2.5 font-medium text-white">
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Karma Score & Level 4+ Senior Contributor filters</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Verified PR merge history & codebase seniority audit</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Targeted alerts when S-Tier contributors open job status</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Commercial candidate pipeline exports (CSV / API)</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleCheckout("pdt_recruiter_pass", billingCycle)}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 cursor-pointer active:scale-[0.98]"
              >
                <span>Unlock Recruiter Pass</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MAINTAINERS PRICING */}
      {activeTab === "maintainers" && (
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold mb-4">
              <Activity className="h-3.5 w-3.5" />
              <span>For Repository Owners & Open Source Maintainers</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-space text-white tracking-tight mb-3">
              Claim Your Scorecard. Attract Better PRs.
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 font-sans leading-relaxed">
              Showcase your team&apos;s review speed, embed official C-Rank badges, and pre-screen contributor submissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Community Maintainer */}
            <div className="rounded-2xl glass-panel p-6 sm:p-8 border border-white/[0.1] shadow-sm flex flex-col justify-between font-sans">
              <div>
                <div className="flex items-center justify-between mb-2 font-mono">
                  <h2 className="text-lg font-bold text-white">Maintainer Basic</h2>
                  <span className="text-xs text-zinc-400 glass-card px-2 py-0.5 rounded">Free</span>
                </div>
                <p className="text-xs text-zinc-400 mb-6">
                  Claim your repository, verify maintainer ownership, and configure basic PR guidelines.
                </p>

                <div className="text-3xl font-bold font-mono text-white mb-6">
                  $0 <span className="text-xs font-normal font-sans text-zinc-400">/ forever</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300 mb-8">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Claim official repository scorecard badge</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Set custom PR submission checklist</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Highlight top Good First Issues</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/maintainers"
                className="w-full py-2.5 rounded-xl glass-card text-zinc-300 font-mono font-bold text-xs uppercase tracking-wider text-center hover:bg-white/[0.08] transition-colors"
              >
                Claim Repository →
              </Link>
            </div>

            {/* Verified Maintainer SLA */}
            <div className="rounded-2xl glass-panel p-6 sm:p-8 border-2 border-amber-500 shadow-xl shadow-amber-950/20 flex flex-col justify-between relative font-sans">
              <div className="absolute -top-3 right-6 bg-amber-500 text-black text-[11px] font-bold font-mono uppercase px-3 py-0.5 rounded-full shadow-sm">
                Maintainer Pro
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 font-mono">
                  <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-amber-400" /> Verified SLA Sponsor
                  </h2>
                </div>
                <p className="text-xs text-zinc-300 mb-6">
                  Promoted placement across GetMerged radar and automated contributor pre-qualification.
                </p>

                <div className="text-3xl font-bold font-mono text-white mb-6">
                  $29 <span className="text-xs font-normal font-sans text-zinc-400">/ month</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300 mb-8">
                  <li className="flex items-center gap-2.5 font-medium text-white">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Featured spotlight on Good First Issues feed</span>
                  </li>
                  <li className="flex items-center gap-2.5 font-medium text-white">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Automated PR pre-qualification bot via GitHub App</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Verified Maintainer SLA badge in search directory</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Instant priority C-Rank rescoring queue</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleCheckout("pdt_maintainer_sla", "monthly")}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer active:scale-[0.98]"
              >
                <span>Upgrade Maintainer SLA</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guarantee & Trust Footer Banner */}
      <div className="max-w-2xl mx-auto rounded-2xl glass-card border border-white/[0.1] p-5 text-center font-sans">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-200 mb-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>100% Transparent, Cancel Anytime</span>
        </div>
        <p className="text-[11px] text-zinc-400">
          All memberships come with an instant 7-day money-back guarantee. No questions asked.
        </p>
      </div>
    </div>
  );
}
