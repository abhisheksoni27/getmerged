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
        <h2 className="text-2xl sm:text-4xl font-black text-black tracking-tight font-display uppercase">How GetMerged works</h2>
        <p className="text-xs sm:text-sm text-neutral-700 font-mono mt-2 leading-relaxed">
          We query raw GitHub GraphQL event streams to compute real maintainer velocity metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {STEPS.map((step) => (
          <div key={step.n} className="rounded-none bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_#000] space-y-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-none bg-[#FACC15] border-2 border-black text-black font-mono font-black text-xs shadow-[2px_2px_0px_0px_#000]">
              {step.n}
            </div>
            <h4 className="text-base sm:text-lg font-black text-black font-display uppercase tracking-tight">{step.title}</h4>
            <p className="text-xs sm:text-sm text-neutral-800 font-mono leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>
    </HomeSection>
  );
}
