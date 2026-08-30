"use client";

import React, { useState } from "react";
import { Zap } from "lucide-react";
import { ClaimIssueModal, type ClaimIssueItem } from "./ClaimIssueModal";

interface ClaimIssueButtonProps {
  issue: ClaimIssueItem;
  username?: string;
}

export function ClaimIssueButton({ issue, username }: ClaimIssueButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer active:scale-[0.98]"
        title="Claim this issue on GitHub with verified GetMerged proof of work"
      >
        <Zap className="h-3.5 w-3.5 text-amber-300" />
        <span>Claim Issue 🚀</span>
      </button>

      <ClaimIssueModal
        issue={issue}
        username={username}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
