"use client";

import React from "react";
import { Search } from "lucide-react";

interface TalentLookupInspectorProps {
  username: string;
  onUsernameChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function TalentLookupInspector({ username, onUsernameChange, onSubmit }: TalentLookupInspectorProps) {
  return (
    <div className="p-6 rounded-2xl glass-panel border border-[var(--border-subtle)] bg-[#121214]/90 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold font-space text-[var(--text-primary)] flex items-center gap-2">
            <Search className="h-4 w-4 text-emerald-400" />
            Inspect Any GitHub Developer&apos;s WorkDone Dossier
          </h3>
          <p className="text-xs text-[var(--text-secondary)] font-sans mt-0.5">
            Enter any public GitHub username to inspect their verified Karma score, merged PR history, and codebase seniority.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">github.com/</span>
          <input
            type="text"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="e.g. torvalds, shadcn, or your candidate's username"
            className="w-full pl-28 pr-4 py-2.5 rounded-xl bg-[#0a0a0c] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shrink-0 cursor-pointer"
        >
          Inspect Profile
        </button>
      </form>
    </div>
  );
}
