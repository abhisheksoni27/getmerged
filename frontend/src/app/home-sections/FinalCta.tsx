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
        className="inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-3.5 font-sans text-sm font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors shrink-0 shadow-sm cursor-pointer"
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
      className="inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-3.5 font-sans text-sm font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors shrink-0 shadow-sm cursor-pointer"
    >
      <span>Sign in with GitHub</span>
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

/** Final bottom CTA banner. */
export function FinalCta({ isLoggedIn, onExplore, onSignIn }: FinalCtaProps) {
  return (
    <HomeSection className="py-16 sm:py-24">
      <div className="rounded-3xl bg-zinc-950 text-white p-10 sm:p-14 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative overflow-hidden">
        <div className="max-w-xl">
          <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-sans leading-tight">
            Ready to find your next contribution?
          </h3>
          <p className="mt-3 text-base text-zinc-400 font-sans leading-relaxed">
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
