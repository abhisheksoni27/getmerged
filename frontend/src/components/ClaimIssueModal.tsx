"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  Copy,
  Check,
  X,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export interface ClaimIssueItem {
  id: string | number;
  repo_name: string;
  issue_number: number;
  title: string;
  url: string;
  labels?: string[];
  c_rank_tier?: string;
  has_linked_pr?: boolean;
  linked_pr_number?: number | null;
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
  username,
  karmaScore,
  karmaLevel,
  isOpen,
  onClose,
}: ClaimIssueModalProps) {
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedSuccess, setClaimedSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; slug?: string } | null>(null);
  const [userKarma, setUserKarma] = useState<{ score: number; level: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Check if user is logged in
    const hasToken = typeof document !== "undefined" && document.cookie.includes("opendoor_token=");
    if (hasToken) {
      fetch(`${API_BASE_URL}/api/v1/auth/me`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user?.username) {
            const u = data.user;
            setCurrentUser({ username: u.username, slug: u.slug || u.username });
            // Fetch real karma for this user
            fetch(`${API_BASE_URL}/api/v1/u/${encodeURIComponent(u.username)}/karma`)
              .then((kr) => (kr.ok ? kr.json() : null))
              .then((kData) => {
                if (kData?.total_karma != null && kData?.rank?.level != null) {
                  setUserKarma({ score: kData.total_karma, level: kData.rank.level });
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !issue || !mounted) return null;

  const resolvedUsername = username || currentUser?.username;
  const resolvedKarmaScore = karmaScore ?? userKarma?.score;
  const resolvedKarmaLevel = karmaLevel ?? userKarma?.level;

  const repoName = issue.repo_name;
  const repoTier = issue.c_rank_tier || "A";
  const repoUrl = `https://getmerged.abhishekco.de/${repoName}`;

  let claimComment = "";
  if (resolvedUsername) {
    const cleanUsername = resolvedUsername.replace(/^@/, "");
    const profileUrl = `https://getmerged.abhishekco.de/u/${cleanUsername}`;
    const karmaLine =
      resolvedKarmaScore != null && resolvedKarmaLevel != null
        ? `- ⚡ Contributor: [@${cleanUsername}](${profileUrl}) (Level ${resolvedKarmaLevel} · ${resolvedKarmaScore.toLocaleString()} Karma)\n`
        : `- ⚡ Contributor: [@${cleanUsername}](${profileUrl})\n`;

    claimComment = `Hey maintainers! 👋 I would love to claim and work on this issue.

Diagnosing PR size sweet spot & review benchmarks via [GetMerged](${repoUrl}):
${karmaLine}- 📊 Target Repository: Tier ${repoTier} Verified Open Source

Starting local reproduction now. Will link draft PR shortly! 🚀`;
  } else {
    claimComment = `Hey maintainers! 👋 I would love to claim and work on this issue.

Diagnosing PR size sweet spot & review benchmarks via [GetMerged](${repoUrl}):
- 📊 Target Repository: Tier ${repoTier} Verified Open Source

Starting local reproduction now. Will link draft PR shortly! 🚀`;
  }

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

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-surface)] font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0D9668] shrink-0">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#0D9668] text-xs font-mono mb-1 font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Claim Issue · Auto-Backlinked Comment</span>
            </div>
            <h3 className="text-xl font-bold font-space text-[var(--text-primary)]">
              Claim Issue #{issue.issue_number}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-0.5">
              Post an enthusiastic, verified claim comment on GitHub to let maintainers know you are on it.
            </p>
          </div>
        </div>

        {/* Issue Target Card */}
        <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[var(--text-secondary)] font-mono text-[11px]">
            <span className="text-[var(--text-primary)] font-bold">{repoName}</span>
            <span className="text-[#0D9668] font-bold">Tier {repoTier} Repo</span>
          </div>
          <p className="text-[var(--text-primary)] font-medium font-sans">{issue.title}</p>
        </div>

        {/* Linked PR in Progress Notice */}
        {issue.has_linked_pr && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[#C4910A] text-xs flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <div className="space-y-1">
              <div className="font-bold font-mono text-xs text-[#C4910A]">
                Pull Request Already In Progress {issue.linked_pr_number ? `(#${issue.linked_pr_number})` : ""}
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                Another contributor has already opened a pull request for this issue on GitHub. Check the issue discussion or existing PR before writing code to prevent duplicate work.
              </p>
            </div>
          </div>
        )}

        {/* Generated Claim Comment Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
            <span>Formatted GitHub Comment (Includes Proof-of-Work Link):</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[#0D9668] hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied!" : "Copy Text"}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-primary)] overflow-x-auto whitespace-pre-wrap leading-relaxed">
            <code>{claimComment}</code>
          </pre>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border-subtle)]">
          <div className="text-xs font-mono text-[var(--text-muted)]">
            Auto-copies text &amp; opens GitHub issue
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={claiming}
              onClick={handleClaimOnGitHub}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0D9668] hover:bg-[#0D9668]/90 disabled:opacity-50 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.98]"
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

  return createPortal(modalContent, document.body);
}
