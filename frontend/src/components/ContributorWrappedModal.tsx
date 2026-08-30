"use client";

import React, { useState } from "react";
import {
  Trophy,
  Sparkles,
  Copy,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

interface ContributorWrappedModalProps {
  username: string;
  name?: string;
  avatarUrl?: string;
  rank?: number;
  karma?: number;
  mergedCount?: number;
  monthName?: string;
  topLang?: string;
  percentile?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ContributorWrappedModal({
  username,
  name,
  avatarUrl = "https://avatars.githubusercontent.com/u/1024025?v=4",
  rank = 4,
  karma = 2450,
  mergedCount = 14,
  monthName = "August 2026",
  topLang = "TypeScript",
  percentile = "Top 1%",
  isOpen,
  onClose,
}: ContributorWrappedModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const cleanUsername = username.replace(/^@/, "");
  const profileUrl = `https://getmerged.abhishekco.de/u/${cleanUsername}`;
  const displayName = name || cleanUsername;

  const tweetText = `Just ranked in the ${percentile} of the @GetMerged Contributor League for ${monthName}! 🚀

⚡ ${karma.toLocaleString()} Karma
🏆 #${rank} Worldwide (${topLang})
✓ ${mergedCount} Verified Production Merges

Check out my proof of work: ${profileUrl}`;

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, "_blank");
  };

  const handleShareLinkedin = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;
    window.open(url, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tweetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto font-sans">
      <div className="relative w-full max-w-xl rounded-3xl glass-panel border border-amber-500/30 bg-[#121214] p-6 sm:p-8 space-y-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full glass-card text-zinc-400 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Contributor Wrapped · Social Brag Card</span>
            </div>
            <h3 className="text-xl font-bold font-space text-white">
              {monthName} Contributor Wrapped
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Flex your verified open source PR merges and ranking with your network.
            </p>
          </div>
        </div>

        {/* The Visual Share Card Asset (Glassmorphic High-Impact Card) */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-amber-950/40 via-zinc-950 to-zinc-900 border border-amber-500/40 space-y-5 shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Brand + Month */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs font-black">
                GM
              </div>
              <span className="text-xs font-mono font-bold text-white tracking-wider">GetMerged League</span>
            </div>
            <span className="text-[11px] font-mono text-amber-400 font-semibold">{monthName}</span>
          </div>

          {/* User Profile Snapshot */}
          <div className="flex items-center gap-3.5 pt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-12 h-12 rounded-full border border-white/20 object-cover"
            />
            <div>
              <div className="text-base font-bold font-space text-white">{displayName}</div>
              <div className="text-xs font-mono text-zinc-400">@{cleanUsername}</div>
            </div>
          </div>

          {/* 3 Metric Pillars */}
          <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-0.5">
              <div className="text-[10px] text-zinc-400 uppercase">League Rank</div>
              <div className="text-base font-black text-amber-400">#{rank}</div>
              <div className="text-[10px] text-emerald-400">{percentile}</div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-0.5">
              <div className="text-[10px] text-zinc-400 uppercase">Karma Score</div>
              <div className="text-base font-black text-emerald-400">⚡ {karma.toLocaleString()}</div>
              <div className="text-[10px] text-zinc-400">{topLang}</div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-0.5">
              <div className="text-[10px] text-zinc-400 uppercase">Merged PRs</div>
              <div className="text-base font-black text-white">{mergedCount} PRs</div>
              <div className="text-[10px] text-zinc-400">Production</div>
            </div>
          </div>

          {/* Card Footer Verification */}
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-white/[0.06]">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Proof-of-Work Verified</span>
            </span>
            <span>getmerged.abhishekco.de/u/{cleanUsername}</span>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={handleShareTwitter}
              className="py-2.5 px-4 rounded-xl bg-[#0a0a0c] hover:bg-black border border-white/[0.15] text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98]"
            >
              <TwitterIcon className="h-4 w-4 text-sky-400" />
              <span>Share on X (Twitter)</span>
            </button>

            <button
              type="button"
              onClick={handleShareLinkedin}
              className="py-2.5 px-4 rounded-xl bg-[#0077b5]/20 hover:bg-[#0077b5]/30 border border-[#0077b5]/50 text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98]"
            >
              <LinkedinIcon className="h-4 w-4 text-[#0077b5]" />
              <span>Share on LinkedIn</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied Brag Post!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Post Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
