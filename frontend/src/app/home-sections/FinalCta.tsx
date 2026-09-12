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
        className="inline-flex items-center gap-2.5 rounded-lg bg-[#ff6b00] px-7 py-3.5 font-sans text-sm font-semibold text-white hover:bg-[#ff8a33] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
      >
        <span>Explore Repos</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    );
  }
  return (
    <button
      onClick={onSignIn}
      title="Sign in to GetMerged"
      className="inline-flex items-center gap-2.5 rounded-lg bg-[#ff6b00] px-7 py-3.5 font-sans text-sm font-semibold text-white hover:bg-[#ff8a33] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
    >
      <span>Sign in to GetMerged</span>
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

/** Final bottom CTA banner. */
export function FinalCta({ isLoggedIn, onExplore, onSignIn }: FinalCtaProps) {
  return (
    <HomeSection className="py-12">
      <div className="rounded-xl bg-[#141414] border border-white/[0.08] p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="max-w-xl">
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight font-sans">
            Ready to find your next contribution?
          </h3>
          <p className="mt-3 text-xs sm:text-sm text-[#a3a3a3] leading-relaxed font-sans">
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
