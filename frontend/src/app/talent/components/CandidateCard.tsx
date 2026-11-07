"use client";

import Link from "next/link";
import { ArrowRight, Lock, MapPin, Sparkles, Zap } from "lucide-react";
import type { CandidateProfile } from "../TalentClient";

interface CandidateCardProps {
  candidate: CandidateProfile;
  onDraftPitch: (candidate: CandidateProfile) => void;
  onInspect: (candidate: CandidateProfile) => void;
  onUnlock: (candidate: CandidateProfile) => void;
}

export function CandidateCard({ candidate: cand, onDraftPitch, onInspect, onUnlock }: CandidateCardProps) {
  return (
    <div className="p-6 rounded-2xl glass-panel border border-[var(--border-subtle)] bg-[#141416]/90 hover:border-blue-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group">
      {/* Left: Avatar + Candidate Info */}
      <div className="space-y-3 max-w-2xl">
        <div className="flex items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cand.avatar_url}
            alt={cand.name}
            className="w-12 h-12 rounded-full border border-[var(--border-subtle)] object-cover"
          />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link prefetch={false}
                href={`/u/${cand.username}`}
                className="text-base font-bold font-space text-[var(--text-primary)] hover:text-blue-400 transition-colors"
              >
                {cand.name}
              </Link>
              <span className="text-xs font-mono text-[var(--text-secondary)]">@{cand.username}</span>

              {cand.open_to_work && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Open to Work · {cand.work_type_preference}
                </span>
              )}
            </div>

            <p className="text-xs text-[var(--text-secondary)] font-sans mt-0.5 leading-snug">
              {cand.headline}
            </p>
          </div>
        </div>

        {/* Badges & Metrics Row */}
        <div className="flex items-center gap-3 flex-wrap text-xs font-mono">
          <span
            className="px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1.5 text-[var(--text-primary)]"
            style={{ backgroundColor: `${cand.badge_color}25`, borderColor: `${cand.badge_color}50`, borderWidth: 1 }}
          >
            <Zap className="h-3.5 w-3.5" style={{ color: cand.badge_color }} />
            <span>{cand.total_karma.toLocaleString()} Karma</span>
            <span className="opacity-80">({cand.level_title})</span>
          </span>

          <span className="glass-card px-2.5 py-0.5 rounded-md text-[var(--text-secondary)]">
            🏆 {cand.percentile}
          </span>

          <span className="glass-card px-2.5 py-0.5 rounded-md text-[var(--text-secondary)] flex items-center gap-1">
            <MapPin className="h-3 w-3 text-[var(--text-secondary)]" /> {cand.location}
          </span>
        </div>

        {/* Work Done Summary */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
            Proven Work Done in Open Source:
          </div>
          <div className="flex flex-wrap gap-2">
            {cand.work_done.slice(0, 2).map((item, idx) => (
              <div
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-[#0a0a0c] border border-[var(--border-subtle)] text-[11px] font-mono text-zinc-300 flex items-center gap-2"
              >
                <span className="text-emerald-400 font-bold">✓</span>
                <span className="font-semibold text-[var(--text-primary)]">{item.repo_name}</span>
                <span className="text-zinc-500">·</span>
                <span className="text-[var(--text-secondary)] truncate max-w-[280px]">{item.pr_title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2 shrink-0 lg:w-52">
        <button
          type="button"
          onClick={() => onDraftPitch(cand)}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-[var(--text-primary)] font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/50 cursor-pointer active:scale-[0.98]"
        >
          <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
          <span>Draft Founder Pitch</span>
        </button>

        <button
          type="button"
          onClick={() => onInspect(cand)}
          className="px-3.5 py-2 rounded-xl glass-panel border border-[var(--border-subtle)] hover:bg-white/[0.08] text-[var(--text-primary)] font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Inspect Dossier</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onUnlock(cand)}
          className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-zinc-800 border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
        >
          <Lock className="h-3.5 w-3.5 text-blue-400" />
          <span>Unlock Contact</span>
        </button>
      </div>
    </div>
  );
}
