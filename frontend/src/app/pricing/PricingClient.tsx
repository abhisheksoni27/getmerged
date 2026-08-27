"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Zap, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export default function PricingClient() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const handleCheckout = (planCycle: "monthly" | "yearly") => {
    window.location.href = `https://checkout.dodopayments.com/buy/pdt_opendoor_pro?billing_cycle=${planCycle}`;
  };

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-12 sm:py-16">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border-emerald-800/80 border border-emerald-200 text-emerald-300 text-xs font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>Built for High-Velocity Open Source Contributors</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-space text-slate-100 tracking-tight mb-3">
          Stop Guessing. Get Your Pull Requests Merged.
        </h1>
        <p className="text-sm sm:text-base text-slate-400 font-sans">
          Unlimited repository acceptance forecasts, live maintainer vibe checks, and automated pre-flight reviews.
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center gap-2 p-1 bg-zinc-200/70 rounded-xl mt-6 border border-slate-700/60 font-mono text-xs">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              billingCycle === "monthly" ? "bg-[#111827] text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-100"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              billingCycle === "yearly" ? "bg-[#111827] text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-100"
            }`}
          >
            Annual Billing
            <span className="bg-emerald-950/80 border-emerald-800/80 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded-full font-sans font-bold">
              Save 27%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
        {/* Free Tier Card */}
        <div className="rounded-2xl bg-[#111827] p-6 sm:p-8 border-2 border-brand-dark shadow-sm flex flex-col justify-between font-sans">
          <div>
            <div className="flex items-center justify-between mb-2 font-mono">
              <h2 className="text-lg font-bold text-slate-100">Community Free</h2>
              <span className="text-xs text-slate-400 bg-[#1e293b] px-2 py-0.5 rounded">Forever</span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Essential tools for exploring repository maintainer responsiveness and finding beginner issues.
            </p>

            <div className="text-3xl font-bold font-mono text-slate-100 mb-6">
              $0 <span className="text-xs font-normal font-sans text-slate-400">/ month</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-300 mb-8">
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Public C-Rank™ metrics (S to D Tier)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>3 PR Likelihood evaluations per month</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Interactive Good First Issues search</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Embeddable dynamic SVG README badges</span>
              </li>
            </ul>
          </div>

          <button
            disabled
            className="w-full py-2.5 rounded-xl bg-[#1e293b] text-slate-400 font-mono font-bold text-xs uppercase tracking-wider text-center"
          >
            Current Plan
          </button>
        </div>

        {/* Pro Tier Card */}
        <div className="rounded-2xl bg-[#111827] p-6 sm:p-8 border-2 border-emerald-600 shadow-sm flex flex-col justify-between relative font-sans">
          <div className="absolute -top-3 right-6 bg-emerald-600 text-white text-[11px] font-bold font-mono uppercase px-3 py-0.5 rounded-full shadow-sm">
            Most Popular
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 font-mono">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-emerald-600 fill-emerald-600" /> Pro Contributor
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Supercharge your open-source journey with unlimited signals and maintainer intelligence.
            </p>

            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold font-mono text-slate-100">
                {billingCycle === "yearly" ? "$79" : "$9"}
              </span>
              <span className="text-xs font-sans text-slate-400">
                {billingCycle === "yearly" ? "/ year ($6.58/mo)" : "/ month"}
              </span>
            </div>

            <ul className="space-y-3 text-xs text-slate-300 mb-8">
              <li className="flex items-center gap-2.5 font-medium text-slate-100">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Unlimited PR Acceptance & Latency Forecasts</span>
              </li>
              <li className="flex items-center gap-2.5 font-medium text-slate-100">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Maintainer Vibe Check & Uncensored PR Guidelines</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Monday Morning Personalized Issue Match Digest</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Unlimited Static Pre-Flight PR Evaluator runs</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Contributor DNA badge & verified social card</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleCheckout(billingCycle)}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            Upgrade to Pro Now <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-3 text-center text-[11px] text-slate-400 font-sans">
            Out of free evaluations?{" "}
            <Link href="/watchlist" title="Invite friends to earn bonus evaluation credits" className="text-emerald-400 font-semibold hover:underline">
              or invite friends
            </Link>{" "}
            to earn extra credits.
          </p>
        </div>
      </div>

      {/* Guarantee Banner */}
      <div className="max-w-2xl mx-auto rounded-2xl bg-[#1e293b] border border-slate-800 p-4 text-center font-sans">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-200 mb-1">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>100% Risk-Free 7-Day Money-Back Guarantee</span>
        </div>
        <p className="text-[11px] text-slate-400">
          If GetMerged does not help you get your pull requests accepted faster within 7 days, email us for an instant full refund.
        </p>
      </div>
    </main>
  );
}
