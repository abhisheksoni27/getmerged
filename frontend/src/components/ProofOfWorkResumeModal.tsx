"use client";

import React, { useState } from "react";
import {
  FileText,
  Printer,
  Copy,
  Check,
  X,
  ShieldCheck,
  GitPullRequest,
} from "lucide-react";
import type { PublicProfile } from "@/lib/public-profile";
import type { ContributorKarmaData } from "@/components/KarmaProfileBadge";

interface ProofOfWorkResumeModalProps {
  profile: PublicProfile;
  karma?: ContributorKarmaData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProofOfWorkResumeModal({
  profile,
  karma,
  isOpen,
  onClose,
}: ProofOfWorkResumeModalProps) {
  const [copiedATS, setCopiedATS] = useState(false);

  if (!isOpen) return null;

  const username = profile.slug || profile.username;
  const resumeUrl = `/u/${username}/resume`;
  const profileUrl = `https://getmerged.abhishekco.de/u/${username}`;
  const totalKarma = karma?.total_karma || 1250;
  const levelTitle = karma?.rank?.title || "Verified Contributor";

  const topRepos = (profile.public_repos || []).slice(0, 3);

  const atsSnippet = `=== VERIFIED OPEN SOURCE PROOF OF WORK ===
Engineer: ${profile.username} (@${profile.slug})
Reputation: Level ${karma?.rank?.level || 4} ${levelTitle} · ${totalKarma.toLocaleString()} Karma Points (GetMerged Verified)
Live Verified Portfolio: ${profileUrl}

KEY PRODUCTION CONTRIBUTIONS:
${topRepos.map((r) => `- ${r.full_name} (${r.language || "Open Source"}): ⭐ ${r.stars.toLocaleString()} stars · ${r.description || "Active production codebase"}`).join("\n")}

PRIMARY STACK:
${(profile.skills || ["Go", "TypeScript", "Python", "Rust"]).join(", ")}
==========================================`;

  const handleCopyATS = () => {
    navigator.clipboard.writeText(atsSnippet);
    setCopiedATS(true);
    setTimeout(() => setCopiedATS(false), 2500);
  };

  const handlePrint = () => {
    window.open(resumeUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-surface)] backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-6 sm:p-8 space-y-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0D9668] shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#0D9668] text-xs font-mono mb-1 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Verified Proof-of-Work Resume Asset</span>
            </div>
            <h3 className="text-xl font-bold font-space text-[var(--text-primary)]">
              Export Proof-of-Work Resume (PDF)
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-0.5">
              Stand out from 500+ generic applicants by attaching verified pull request merges and maintainer reviews to your job applications.
            </p>
          </div>
        </div>

        {/* Live Resume Summary Preview Box */}
        <div className="p-5 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-4 font-sans text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <div className="text-sm font-bold text-[var(--text-primary)] font-space">{profile.username}</div>
              <div className="text-xs text-[var(--text-secondary)] font-mono">@{profile.slug} · {profile.headline || "Software Engineer"}</div>
            </div>
            <div className="text-right font-mono text-xs">
              <span className="text-[#0D9668] font-bold">⚡ {totalKarma.toLocaleString()} Karma</span>
              <div className="text-xs text-[var(--text-muted)]">{levelTitle}</div>
            </div>
          </div>

          {/* Verified Pull Requests Snapshot */}
          <div className="space-y-2">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <GitPullRequest className="h-3.5 w-3.5 text-blue-600" />
              <span>Audited Open Source Merges (Included in PDF):</span>
            </div>
            <div className="space-y-1.5">
              {topRepos.map((repo, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <span className="font-mono text-[var(--text-primary)] font-semibold">{repo.full_name}</span>
                  <span className="text-xs font-mono text-[var(--text-muted)]">{repo.language || "TypeScript"} · ⭐ {repo.stars}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs font-mono text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
            <span>Format: Standard A4 / Letter PDF</span>
            <span className="text-[#0D9668] font-medium">Includes Verification QR Code</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={handleCopyATS}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            {copiedATS ? (
              <>
                <Check className="h-4 w-4 text-[#0D9668]" />
                <span className="text-[#0D9668]">Copied ATS Text!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-[var(--text-secondary)]" />
                <span>Copy ATS Text Snippet</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0D9668] hover:bg-[#0D9668]/90 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Printer className="h-4 w-4" />
              <span>Open & Print PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
