"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  X,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

export interface ClaimIssueItem {
  id: string | number;
  repo_name: string;
  issue_number: number;
  title: string;
  url: string;
  labels?: string[];
  c_rank_tier?: string;
}

interface ClaimIssueModalProps {
  issue: ClaimIssueItem | null;
  username?: string;
  karmaScore?: number;
  karmaLevel?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ClaimIssueModal({
  issue,
  username = "contributor",
  karmaScore = 1450,
  karmaLevel = 4,
  isOpen,
  onClose,
}: ClaimIssueModalProps) {
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedSuccess, setClaimedSuccess] = useState(false);

  if (!isOpen || !issue) return null;

  const cleanUsername = username.replace(/^@/, "");
  const repoName = issue.repo_name;
  const repoTier = issue.c_rank_tier || "A";
  const repoUrl = `https://getmerged.abhishekco.de/${repoName}`;
  const profileUrl = `https://getmerged.abhishekco.de/u/${cleanUsername}`;

  const claimComment = `Hey maintainers! 👋 I would love to claim and work on this issue.

Diagnosing PR size sweet spot & review benchmarks via [GetMerged](${repoUrl}):
- ⚡ Contributor: [@${cleanUsername}](${profileUrl}) (Level ${karmaLevel} · ${karmaScore.toLocaleString()} Karma)
- 📊 Target Repository: Tier ${repoTier} Verified Open Source

Starting local reproduction now. Will link draft PR shortly! 🚀`;

  const handleCopy = () => {
    navigator.clipboard.writeText(claimComment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClaimOnGitHub = () => {
    navigator.clipboard.writeText(claimComment);
    setClaiming(true);
    setTimeout(() => {
      setClaiming(false);
      setClaimedSuccess(true);
      window.open(`${issue.url}#new_comment_field`, "_blank");
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto font-sans">
      <div className="relative w-full max-w-xl rounded-3xl glass-panel border border-emerald-500/30 bg-[#121214] p-6 sm:p-8 space-y-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full glass-card text-zinc-400 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Claim Issue · Auto-Backlinked Comment</span>
            </div>
            <h3 className="text-xl font-bold font-space text-white">
              Claim Issue #{issue.issue_number}
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Post an enthusiastic, verified claim comment on GitHub to let maintainers know you are on it.
            </p>
          </div>
        </div>

        {/* Issue Target Card */}
        <div className="p-4 rounded-xl bg-[#09090b] border border-white/[0.08] space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px]">
            <span className="text-white font-bold">{repoName}</span>
            <span className="text-emerald-400">Tier {repoTier} Repo</span>
          </div>
          <p className="text-zinc-200 font-medium font-sans">{issue.title}</p>
        </div>

        {/* Generated Claim Comment Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Formatted GitHub Comment (Includes Proof-of-Work Link):</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied!" : "Copy Text"}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-[#08080a] border border-white/[0.08] font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap selection:bg-emerald-500/30 leading-relaxed">
            <code>{claimComment}</code>
          </pre>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.08]">
          <div className="text-[11px] font-mono text-zinc-400">
            Auto-copies text &amp; opens GitHub issue
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={claiming}
              onClick={handleClaimOnGitHub}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-[0.98]"
            >
              {claimedSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Opened on GitHub!</span>
                </>
              ) : claiming ? (
                <span>Opening GitHub...</span>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  <span>Claim on GitHub Issue →</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
