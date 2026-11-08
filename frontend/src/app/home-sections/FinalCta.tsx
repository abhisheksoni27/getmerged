"use client";

import { ArrowRight } from "lucide-react";
import { HomeSection } from "./HomeSection";

interface FinalCtaProps {
  isLoggedIn: boolean;
  onExplore: () => void;
  onSignIn: () => void;
}

function CtaAction({ isLoggedIn, onExplore, onSignIn }: FinalCtaProps) {
  if (isLoggedIn) {
    return (
      <button
        onClick={onExplore}
        className="scan-btn inline-flex items-center gap-2 text-xs font-semibold cursor-pointer"
      >
        <span>Explore Repositories</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    );
  }
  return (
    <button
      onClick={onSignIn}
      title="Sign in to GetMerged"
      className="scan-btn inline-flex items-center gap-2 text-xs font-semibold cursor-pointer"
    >
      <span>Sign in with GitHub</span>
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

/** Final bottom CTA banner. */
export function FinalCta({ isLoggedIn, onExplore, onSignIn }: FinalCtaProps) {
  return (
    <HomeSection className="py-12 sm:py-16">
      <div className="card card-highlight p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="max-w-xl">
          <div className="hero-badge mb-3">
            <span className="dot" />
            <span>START CONTRIBUTING TODAY</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] font-display leading-tight">
            Ready to find your next contribution?
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] font-sans leading-relaxed">
            {isLoggedIn
              ? "Explore indexed repositories above or filter by your favorite tech stack."
              : "Sign in with GitHub to watch repositories, unlock maintainer guidelines, and receive PR review alerts."}
          </p>
        </div>
        <CtaAction isLoggedIn={isLoggedIn} onExplore={onExplore} onSignIn={onSignIn} />
      </div>
    </HomeSection>
  );
}
