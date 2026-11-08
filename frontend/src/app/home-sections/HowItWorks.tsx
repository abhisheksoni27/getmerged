"use client";

import { HomeSection } from "./HomeSection";

const STEPS = [
  {
    n: "01",
    title: "Review Speed",
    body: "We calculate how quickly maintainers post actionable reviews. Projects replying within 24 hours score highest.",
  },
  {
    n: "02",
    title: "New Contributor Merge Rate",
    body: "Measures the success rate of developers opening their very first PR, filtering out internal bot merges.",
  },
  {
    n: "03",
    title: "Verified Reviews",
    body: "Sign in with GitHub to share genuine feedback on your contributor onboarding experience.",
  },
];

/** How-it-works 3-column explainer. */
export function HowItWorks() {
  return (
    <HomeSection className="py-12 sm:py-16">
      <div className="max-w-3xl mb-8">
        <div className="hero-badge mb-2">
          <span className="dot" />
          <span>REAL-TIME INGESTION</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight font-display">How GetMerged works</h2>
        <p className="text-sm text-[var(--text-secondary)] font-sans mt-2 leading-relaxed">
          We query raw GitHub GraphQL event streams to compute real maintainer velocity metrics.
        </p>
      </div>

      <div className="grid-3">
        {STEPS.map((step) => (
          <div key={step.n} className="card p-6 sm:p-7 space-y-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#21262D] text-[var(--purple-bright)] border border-[var(--border-subtle)] font-mono font-bold text-xs">
              {step.n}
            </div>
            <h4 className="text-base font-bold text-[var(--text-primary)] font-display tracking-tight">{step.title}</h4>
            <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>
    </HomeSection>
  );
}
