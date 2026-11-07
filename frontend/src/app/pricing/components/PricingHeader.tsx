import React from "react";

export function PricingHeader() {
  return (
    <div className="text-center max-w-2xl mx-auto space-y-3">
      <h1 className="text-3xl sm:text-5xl font-black text-[var(--text-primary)] font-space tracking-tight">
        Pro Contributor Plans & Pricing
      </h1>
      <p className="text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed">
        Upgrade to GetMerged Pro for unlimited repository acceptance forecasts, live maintainer vibe checks, and automated pre-flight pull request reviews.
      </p>
    </div>
  );
}
