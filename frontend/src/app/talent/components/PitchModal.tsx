"use client";

import { Check, Copy, Send, Sparkles, X } from "lucide-react";
import type { CandidateProfile } from "../TalentClient";

export type PitchTone = "peer" | "deep" | "coffee";

export interface GeneratedPitch {
  subject: string;
  body: string;
}

interface PitchModalProps {
  candidate: CandidateProfile;
  pitch: GeneratedPitch;
  company: string;
  onCompanyChange: (value: string) => void;
  senderTitle: string;
  onSenderTitleChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  challenge: string;
  onChallengeChange: (value: string) => void;
  tone: PitchTone;
  onToneChange: (tone: PitchTone) => void;
  copied: boolean;
  onCopy: () => void;
  onSendEmail: (candidate: CandidateProfile) => void;
  onClose: () => void;
}

export function PitchModal({
  candidate,
  pitch,
  company,
  onCompanyChange,
  senderTitle,
  onSenderTitleChange,
  role,
  onRoleChange,
  challenge,
  onChallengeChange,
  tone,
  onToneChange,
  copied,
  onCopy,
  onSendEmail,
  onClose,
}: PitchModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl glass-panel border border-violet-500/30 bg-[#121214] p-6 sm:p-8 space-y-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full glass-card text-zinc-400 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/40 flex items-center justify-center text-violet-400 shrink-0">
            <Sparkles className="h-6 w-6 text-cyan-300" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[11px] font-mono mb-1">
              Founder-to-Engineer Pitch Engine · 80%+ Reply Rate
            </div>
            <h3 className="text-xl font-bold font-space text-white">
              Technical Pitch for {candidate.name}
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Generates an ego-stroking, hyper-targeted peer-to-peer message analyzing their exact PR in <strong className="text-white">{candidate.top_repos[0]}</strong>.
            </p>
          </div>
        </div>

        {/* Config Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#0a0a0c] border border-white/[0.08] text-xs font-sans">
          <div className="space-y-1.5">
            <label className="text-zinc-400 font-mono text-[11px] flex items-center gap-1">
              <span>Your Company / Team Name:</span>
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.1] text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
              placeholder="e.g. Acme Infra"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-400 font-mono text-[11px]">Your Role / Title:</label>
            <input
              type="text"
              value={senderTitle}
              onChange={(e) => onSenderTitleChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.1] text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
              placeholder="e.g. CTO & Co-Founder"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-zinc-400 font-mono text-[11px]">Role & Target Comp:</label>
            <input
              type="text"
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.1] text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
              placeholder="e.g. Staff Distributed Systems Lead ($240k–$300k + equity)"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-zinc-400 font-mono text-[11px]">Your Core Technical Challenge (Symmetry Hook):</label>
            <input
              type="text"
              value={challenge}
              onChange={(e) => onChallengeChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.1] text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
              placeholder="e.g. scaling our low-latency distributed cluster architecture"
            />
          </div>

          {/* Pitch Tone Selector */}
          <div className="sm:col-span-2 pt-1 flex items-center gap-2 flex-wrap font-mono text-[11px]">
            <span className="text-zinc-400">Pitch Style:</span>
            <button
              type="button"
              onClick={() => onToneChange("peer")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                tone === "peer"
                  ? "bg-violet-600 text-white font-bold"
                  : "glass-card text-zinc-400 hover:text-white"
              }`}
            >
              Architecture Peer (Standard)
            </button>
            <button
              type="button"
              onClick={() => onToneChange("deep")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                tone === "deep"
                  ? "bg-violet-600 text-white font-bold"
                  : "glass-card text-zinc-400 hover:text-white"
              }`}
            >
              Deep Technical Flattery (PR Diffs)
            </button>
            <button
              type="button"
              onClick={() => onToneChange("coffee")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                tone === "coffee"
                  ? "bg-violet-600 text-white font-bold"
                  : "glass-card text-zinc-400 hover:text-white"
              }`}
            >
              Fast 2-Line Coffee Chat
            </button>
          </div>
        </div>

        {/* Live Generated Message Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Generated Outreach Pitch (Ready to Send):</span>
            <span className="text-emerald-400 flex items-center gap-1">
              ✓ High-conversion peer format
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#09090b] border border-violet-500/20 space-y-3 font-mono text-xs text-zinc-200 selection:bg-violet-500/30">
            <div className="pb-2 border-b border-white/[0.06] text-zinc-300">
              <span className="text-zinc-500">Subject: </span>
              <strong className="text-white">{pitch.subject}</strong>
            </div>
            <div className="whitespace-pre-wrap leading-relaxed font-sans text-sm text-zinc-200">
              {pitch.body}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.08]">
          <div className="text-[11px] font-mono text-zinc-400">
            Direct Candidate Email: <span className="blur-[4px] select-none text-zinc-300">masked@private.dev</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCopy}
              className="px-5 py-2.5 rounded-xl glass-panel border border-white/[0.15] hover:bg-white/[0.08] text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied Pitch!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-zinc-300" />
                  <span>Copy Pitch</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSendEmail(candidate)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-950/40 cursor-pointer active:scale-[0.98]"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send Direct Email ($49/mo)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
