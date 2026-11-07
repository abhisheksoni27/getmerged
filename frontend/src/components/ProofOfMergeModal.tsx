"use client";

import React, { useState } from "react";
import { X, Sparkles, Award, Copy, Check, ExternalLink } from "lucide-react";

interface ProofOfMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prTitle: string;
  prNumber: number;
  repoFullName: string;
  cRankTier: string;
  karmaEarned: number;
  username: string;
}

export function ProofOfMergeModal({
  isOpen,
  onClose,
  prTitle,
  prNumber,
  repoFullName,
  cRankTier,
  karmaEarned,
  username,
}: ProofOfMergeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareText = `🚀 Just got my Pull Request #${prNumber} merged into ${repoFullName}! Earned +${karmaEarned} contributor Karma on @GetMerged. Check my open-source profile: https://getmerged.abhishekco.de/u/${username}`;
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://getmerged.abhishekco.de/u/${username}`)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-[var(--text-primary)] font-sans bg-gradient-to-b from-emerald-950/40 via-zinc-950/90 to-zinc-950">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-zinc-700 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Celebration Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/80 animate-bounce">
            <Award className="h-8 w-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>PR Merged on GitHub</span>
          </div>
          <h3 className="text-2xl font-black font-space text-[var(--text-primary)]">
            Pull Request Merged!
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            Your pull request to <strong>{repoFullName}</strong> was merged! You earned +{karmaEarned} Karma points.
          </p>
        </div>

        {/* Verified Certificate Card */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-emerald-500/30 space-y-3 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono text-[var(--text-secondary)]">Repository</div>
              <div className="text-sm font-bold font-mono text-[var(--text-primary)]">{repoFullName}</div>
            </div>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
              Tier {cRankTier}
            </span>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono text-[var(--text-secondary)]">PR #{prNumber}</div>
              <div className="text-xs text-[var(--text-secondary)] truncate max-w-[220px]">{prTitle}</div>
            </div>
            <div className="text-right">
              <div className="text-base font-black font-mono text-emerald-400">+{karmaEarned} Karma</div>
              <div className="text-[10px] font-mono text-[var(--text-secondary)]">Proof-of-Work Pts</div>
            </div>
          </div>
        </div>

        {/* 1-Click Social Sharing */}
        <div className="space-y-2.5">
          <div className="text-xs font-mono font-semibold text-[var(--text-secondary)] text-center">
            Brag & Build Your Developer Reputation:
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={xShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 rounded-xl bg-black hover:bg-zinc-800 border border-[var(--border-subtle)] text-xs font-mono font-bold text-[var(--text-primary)] flex items-center justify-center gap-2 transition-all cursor-pointer no-underline"
            >
              <span>Share on X</span>
              <ExternalLink className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            </a>
            <a
              href={linkedInShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 rounded-xl bg-[#0a66c2] hover:bg-[#084e96] text-xs font-mono font-bold text-[var(--text-primary)] flex items-center justify-center gap-2 transition-all cursor-pointer no-underline"
            >
              <span>Post to LinkedIn</span>
              <ExternalLink className="h-3.5 w-3.5 text-[var(--text-primary)]/80" />
            </a>
          </div>

          <button
            onClick={handleCopy}
            className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Brag Post Text</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
