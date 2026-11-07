"use client";

import React from "react";
import Link from "next/link";
import { FileText, Share2 } from "lucide-react";
import type { MeInfo } from "./types";

interface MeProfilePanelProps {
  me: MeInfo | null;
  sharing: boolean;
  updatingVisibility: boolean;
  onToggleVisibility: (isPublic: boolean) => void;
  onShare: () => void;
}

export function MeProfilePanel({
  me,
  sharing,
  updatingVisibility,
  onToggleVisibility,
  onShare,
}: MeProfilePanelProps) {
  if (!me?.slug) return null;
  return (
    <>
      {/* AC1: profile is private by default; explicit opt-in toggle */}
      <label
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] glass-panel px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none"
        title="Anyone with your /u link can see your track record"
      >
        <input
          type="checkbox"
          data-testid="public-profile-toggle"
          checked={!!me.is_public}
          disabled={updatingVisibility}
          onChange={(e) => onToggleVisibility(e.target.checked)}
          className="h-3.5 w-3.5 accent-emerald-600 cursor-pointer disabled:opacity-50"
        />
        Public
      </label>
      <button
        onClick={onShare}
        disabled={sharing}
        data-testid="share-profile"
        title={me?.is_public ? "Copy your public profile link" : "Make your profile public and copy the link"}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
      >
        <Share2 className={`h-3.5 w-3.5 ${sharing ? "animate-pulse" : ""}`} />
        Share profile
      </button>
      <Link prefetch={false}
        href={`/u/${me.slug}/resume`}
        target="_blank"
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 whitespace-nowrap transition-colors"
        title="Print your verified Proof-of-Work PDF resume"
      >
        <FileText className="h-3.5 w-3.5" />
        <span>PDF Resume</span>
      </Link>
    </>
  );
}
