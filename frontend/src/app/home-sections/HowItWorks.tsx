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
    <HomeSection className="py-16 sm:py-24">
      <div className="max-w-3xl mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-zinc-950 tracking-tight font-sans">How GetMerged works</h2>
        <p className="text-base text-zinc-600 font-sans mt-3 leading-relaxed">
          We query raw GitHub GraphQL event streams to compute real maintainer velocity metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {STEPS.map((step) => (
          <div key={step.n} className="rounded-2xl bg-white border border-zinc-200/90 p-7 sm:p-8 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all space-y-3.5">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 font-mono font-bold text-xs">
              {step.n}
            </div>
            <h4 className="text-lg font-bold text-zinc-950 font-sans tracking-tight">{step.title}</h4>
            <p className="text-sm text-zinc-600 font-sans leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>
    </HomeSection>
  );
}
