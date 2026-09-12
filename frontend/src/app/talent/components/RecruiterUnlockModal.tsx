"use client";

import { Briefcase, Mail, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { LinkedinIcon } from "@/components/icons";
import type { CandidateProfile } from "../TalentClient";

interface RecruiterUnlockModalProps {
  candidate: CandidateProfile;
  onClose: () => void;
}

export function RecruiterUnlockModal({ candidate, onClose }: RecruiterUnlockModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg rounded-3xl glass-panel border border-blue-500/40 bg-[#121214] p-6 sm:p-8 space-y-6 shadow-2xl text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full glass-card text-zinc-400 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
          <Briefcase className="h-6 w-6" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold font-space text-white">
            Unlock Direct Contact for {candidate.name}
          </h3>
          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            Connect directly with {candidate.name} via verified work email and LinkedIn.
          </p>
        </div>

        {/* Blurred Contact Preview */}
        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08] space-y-2 text-left font-mono text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> Email:
            </span>
            <span className="blur-[5px] select-none text-zinc-300">masked@private.dev</span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-2">
              <LinkedinIcon className="h-3.5 w-3.5" /> LinkedIn:
            </span>
            <span className="blur-[5px] select-none text-zinc-300">linkedin.com/in/private-url</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/pricing?tab=recruiter"
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-950/60"
          >
            <span>Get WorkDone Founder Pass ($49/mo)</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-[11px] font-sans text-zinc-400">
            Includes 25 verified direct contact unlocks, ATS exports, and instant alerts when new Tier-S contributors open up.
          </p>
        </div>
      </div>
    </div>
  );
}
