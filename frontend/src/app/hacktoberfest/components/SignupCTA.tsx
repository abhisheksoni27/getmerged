"use client";

import { Zap } from "lucide-react";

export function SignupCTA({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="py-12 text-center">
      <div className="inline-flex p-3 rounded-2xl bg-orange-50 text-orange-600 mb-3">
        <Zap className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-white font-space">Track Your 4 Hacktoberfest PRs</h3>
      <p className="text-xs text-zinc-300 max-w-md mx-auto mt-1 mb-4">
        Sign in with your GitHub account to automatically monitor your merged PRs and unlock your verified completion badge.
      </p>
      <button
        type="button"
        onClick={onSignIn}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl glass-card text-white text-xs font-semibold hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
      >
        Sign in with GitHub
      </button>
    </div>
  );
}
