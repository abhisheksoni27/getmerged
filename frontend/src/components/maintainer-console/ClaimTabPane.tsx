"use client";

import React from "react";
import {
  CheckCircle2,
  Copy,
  Check,
  FileCode,
  RefreshCw,
} from "lucide-react";
import { ClaimInitiateResponse } from "@/types/opendoor";

interface ClaimTabPaneProps {
  fullName: string;
  loading: boolean;
  verifying: boolean;
  claimData: ClaimInitiateResponse | null;
  copied: boolean;
  onCopy: () => void;
  onVerify: () => void;
}

function ClaimIntro({ fullName }: { fullName: string }) {
  return (
    <div className="glass-card p-5 rounded-2xl border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] leading-relaxed">
      <p className="font-semibold text-[var(--text-primary)] mb-1">
        Verify ownership of <span className="font-mono text-blue-600">{fullName}</span>
      </p>
      <p>
        Claiming this repository unlocks the Maintainer Console, showing your real-time
        C-Rank breakdown and prioritized actions to increase your project’s welcoming score.
      </p>
    </div>
  );
}

export function ClaimTabPane({
  fullName,
  loading,
  verifying,
  claimData,
  copied,
  onCopy,
  onVerify,
}: ClaimTabPaneProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <ClaimIntro fullName={fullName} />
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--text-primary)]" />
          <span className="text-sm font-medium">Generating verification token...</span>
        </div>
      </div>
    );
  }

  if (!claimData?.file_instructions) {
    return (
      <div className="space-y-6">
        <ClaimIntro fullName={fullName} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClaimIntro fullName={fullName} />
      <div className="space-y-4">
        <div className="border border-[var(--border-subtle)] rounded-2xl p-4 bg-amber-950/70 border-amber-800/80/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-amber-600" /> Method 1: Proof File (Recommended)
            </span>
            <span className="text-[11px] font-mono text-[var(--text-secondary)] glass-panel px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
              Expires in 24 hours
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Create a file named <code className="px-1.5 py-0.5 glass-panel border border-[var(--border-subtle)] rounded font-mono font-bold text-[var(--text-primary)]">{claimData.file_instructions.file_name}</code> in your repository root with this exact content:
          </p>
          <div className="relative glass-card text-emerald-400 p-3.5 rounded-xl font-mono text-xs break-all flex items-center justify-between border border-[var(--border-subtle)]">
            <code>{claimData.file_instructions.file_content}</code>
            <button
              onClick={onCopy}
              className="ml-3 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[var(--text-primary)] rounded-lg text-xs font-sans font-medium flex items-center gap-1 shrink-0 border border-[var(--border-subtle)] cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="border border-[var(--border-subtle)] rounded-2xl p-4 glass-card flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Or verify automatically if your GitHub account has push/admin permission on this repository.</span>
          <span className="font-mono font-bold text-[var(--text-primary)]">Automatic on GitHub Login</span>
        </div>

        <button
          onClick={onVerify}
          disabled={verifying}
          className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-2xl border border-[var(--border-subtle)] shadow-sm hover:shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {verifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Verifying File on GitHub...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> Check &amp; Verify Ownership
            </>
          )}
        </button>
      </div>
    </div>
  );
}
