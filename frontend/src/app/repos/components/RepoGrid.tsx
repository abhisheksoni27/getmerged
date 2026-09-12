"use client";

import React from "react";
import { Search, RotateCcw } from "lucide-react";
import { RepoCard } from "@/components/RepoCard";
import { Repo } from "@/types/opendoor";

interface RepoGridProps {
  loading: boolean;
  repos: Repo[];
  isLoggedIn: boolean;
  onReset: () => void;
}

export function RepoGrid({ loading, repos, isLoggedIn, onReset }: RepoGridProps) {
  if (loading) {
    return (
      <section aria-live="polite">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-3xl glass-card border border-white/[0.1] p-6 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (repos.length === 0) {
    return (
      <section aria-live="polite">
        <div className="text-center py-16 px-4 rounded-3xl glass-panel border border-white/[0.1] max-w-lg mx-auto">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl glass-card border border-white/[0.1] text-zinc-300 mb-4">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold font-space text-white mb-1">
            No matching repositories found
          </h3>
          <p className="text-xs text-zinc-300 font-sans max-w-sm mx-auto mb-6">
            Try adjusting your search query, language filters, or star count parameters to explore more results.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white px-5 py-2.5 text-xs font-bold font-mono transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-live="polite">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repos.map((repo) => (
          <RepoCard key={repo.id || repo.full_name} repo={repo} isLoggedIn={isLoggedIn} />
        ))}
      </div>
    </section>
  );
}
