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
        className="inline-flex items-center gap-2.5 rounded-none bg-black px-7 py-3.5 font-mono text-xs font-black uppercase text-[#FACC15] hover:bg-white hover:text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shrink-0 cursor-pointer"
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
      className="inline-flex items-center gap-2.5 rounded-none bg-black px-7 py-3.5 font-mono text-xs font-black uppercase text-[#FACC15] hover:bg-white hover:text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shrink-0 cursor-pointer"
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
      <div className="rounded-none bg-[#FACC15] border-2 border-black p-8 sm:p-12 shadow-[4px_4px_0px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="max-w-xl">
          <h3 className="text-2xl sm:text-4xl font-black text-black tracking-tight leading-tight font-display uppercase">
            Ready to find your next contribution?
          </h3>
          <p className="mt-3 text-xs sm:text-sm text-black font-mono font-medium leading-relaxed">
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
