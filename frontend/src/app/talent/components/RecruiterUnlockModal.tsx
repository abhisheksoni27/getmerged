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
          className="absolute right-5 top-5 p-2 rounded-full glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
          <Briefcase className="h-6 w-6" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold font-space text-[var(--text-primary)]">
            Unlock Direct Contact for {candidate.name}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
            Connect directly with {candidate.name} via verified work email and LinkedIn.
          </p>
        </div>

        {/* Blurred Contact Preview */}
        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-[var(--border-subtle)] space-y-2 text-left font-mono text-xs">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> Email:
            </span>
            <span className="blur-[5px] select-none text-[var(--text-secondary)]">masked@private.dev</span>
          </div>
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="flex items-center gap-2">
              <LinkedinIcon className="h-3.5 w-3.5" /> LinkedIn:
            </span>
            <span className="blur-[5px] select-none text-[var(--text-secondary)]">linkedin.com/in/private-url</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-xs font-sans text-[var(--text-secondary)] text-center">
            Candidate direct contact is currently in private preview.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-[var(--text-primary)] font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
