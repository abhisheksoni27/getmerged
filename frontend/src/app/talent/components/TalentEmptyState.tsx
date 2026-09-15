"use client";

import Link from "next/link";
import { UserCheck } from "lucide-react";

export function TalentEmptyState() {
  return (
    <div className="p-12 text-center rounded-3xl glass-panel border border-white/[0.08] bg-[#0c0c0e]/80 space-y-5">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center mx-auto text-zinc-400">
        <UserCheck className="h-6 w-6 text-emerald-400" />
      </div>

      <div className="space-y-2 max-w-md mx-auto">
        <h3 className="text-lg font-bold font-space text-white">
          Zero Fake Profiles · Real Opt-Ins Only
        </h3>
        <p className="text-xs text-zinc-400 font-sans leading-relaxed">
          WorkDone Database never scrapes fake profiles or sells scraped emails. Only verified GitHub contributors who explicitly opt in through their dashboard appear here.
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link prefetch={false}
          href="/dashboard"
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/40"
        >
          <UserCheck className="h-4 w-4" />
          <span>Opt In to Talent Pool (For Devs)</span>
        </Link>
        <Link prefetch={false}
          href="/pricing?tab=recruiter"
          className="px-6 py-2.5 rounded-xl glass-panel border border-white/[0.14] hover:bg-white/[0.08] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all"
        >
          <span>Set Up Founder Talent Alert ($49/mo)</span>
        </Link>
      </div>
    </div>
  );
}
