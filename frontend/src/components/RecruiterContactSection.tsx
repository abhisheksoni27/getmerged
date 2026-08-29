"use client";

import React, { useState } from "react";
import { Briefcase, Sparkles } from "lucide-react";
import { RecruiterInterestModal } from "./RecruiterInterestModal";

interface RecruiterContactSectionProps {
  username: string;
  slug?: string;
}

export function RecruiterContactSection({ username, slug }: RecruiterContactSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl glass-panel text-white p-6 sm:p-8 shadow-sm border border-white/[0.1]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold mb-2">
              <Briefcase className="h-3.5 w-3.5" /> Recruiter & Sponsor Direct Signal
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-sans text-white">
              Interested in hiring or sponsoring @{username}?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1.5 max-w-lg">
              Register verified hiring interest directly on GetMerged. We facilitate high-signal developer introductions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-5 py-3 text-xs font-mono font-bold text-white transition-all shadow-sm shrink-0 cursor-pointer active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            <span>Connect on GetMerged</span>
          </button>
        </div>
      </div>

      <RecruiterInterestModal
        username={username}
        slug={slug}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
