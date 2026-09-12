"use client";

import { CheckCircle2, ExternalLink, Lock, Sparkles, X } from "lucide-react";
import type { CandidateProfile } from "../TalentClient";

interface DossierModalProps {
  candidate: CandidateProfile;
  onClose: () => void;
  onDraftPitch: (candidate: CandidateProfile) => void;
  onUnlock: (candidate: CandidateProfile) => void;
}

export function DossierModal({ candidate, onClose, onDraftPitch, onUnlock }: DossierModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl glass-panel border border-white/[0.15] bg-[#121214] p-6 sm:p-8 space-y-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full glass-card text-zinc-400 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={candidate.avatar_url}
            alt={candidate.name}
            className="w-14 h-14 rounded-full border border-white/[0.2]"
          />
          <div>
            <h3 className="text-xl font-bold font-space text-white">
              {candidate.name}
            </h3>
            <p className="text-xs text-zinc-300 font-sans">{candidate.headline}</p>
            <div className="flex items-center gap-2 mt-1 font-mono text-xs text-zinc-400">
              <span>⚡ {candidate.total_karma.toLocaleString()} Karma</span>
              <span>·</span>
              <span className="text-emerald-400">{candidate.percentile}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Audited Open Source Pull Requests:
          </h4>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {candidate.work_done.map((pr, i) => (
              <div key={i} className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-white font-mono">{pr.repo_name}</span>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Tier {pr.repo_tier} Reputed Repo
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-sans leading-relaxed">{pr.pr_title}</p>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/[0.04]">
                  <span>Diff: +{pr.lines_added} / -{pr.lines_deleted} lines</span>
                  <span>Review Speed: {pr.turnaround_hours}h</span>
                  <a
                    href={pr.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                  >
                    <span>View PR Diff</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={() => onDraftPitch(candidate)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            <span>Draft Founder Pitch for this PR</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onUnlock(candidate)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Unlock Contact</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
