import React from "react";
import { ShieldCheck } from "lucide-react";

export function TrustFooter() {
  return (
    <div className="max-w-2xl mx-auto rounded-2xl glass-card border border-white/[0.1] p-5 text-center font-sans">
      <div className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-200 mb-1.5">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <span>100% Transparent, Cancel Anytime</span>
      </div>
      <p className="text-[11px] text-zinc-400">
        All memberships come with an instant 7-day money-back guarantee. No questions asked.
      </p>
    </div>
  );
}
