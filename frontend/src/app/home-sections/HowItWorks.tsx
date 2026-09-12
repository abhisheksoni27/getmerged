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
    <HomeSection className="py-12">
      <div className="max-w-3xl mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">How GetMerged works</h2>
        <p className="text-xs sm:text-sm text-[#737373] font-sans mt-2 leading-relaxed">
          We query raw GitHub GraphQL event streams to compute real maintainer velocity metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 font-sans">
        {STEPS.map((step) => (
          <div key={step.n} className="space-y-2.5">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-white font-mono font-bold text-xs">
              {step.n}
            </div>
            <h4 className="text-base font-bold text-white">{step.title}</h4>
            <p className="text-xs text-[#a3a3a3] leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>
    </HomeSection>
  );
}
