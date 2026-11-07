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
  viewMode?: "row" | "card";
}

export function RepoGrid({ loading, repos, isLoggedIn, onReset, viewMode = "row" }: RepoGridProps) {
  if (loading) {
    return (
      <section aria-live="polite">
        {viewMode === "row" ? (
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 animate-pulse" />
            ))}
          </div>
        )}
      </section>
    );
  }

  if (repos.length === 0) {
    return (
      <section aria-live="polite">
        <div className="text-center py-16 px-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] max-w-lg mx-auto shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] mb-4">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold font-display text-[var(--text-primary)] mb-1">
            No matching repositories found
          </h3>
          <p className="text-xs text-[var(--text-secondary)] font-sans max-w-sm mx-auto mb-6 leading-relaxed">
            Try adjusting your search query, language filters, or star count parameters to explore more results.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-primary)] hover:bg-[var(--color-neutral-800)] text-[var(--bg-canvas)] px-5 py-2.5 text-xs font-bold font-mono transition-all cursor-pointer shadow-sm"
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
      {viewMode === "row" ? (
        <div className="flex flex-col gap-3">
          {repos.map((repo) => (
            <RepoCard key={repo.id || repo.full_name} repo={repo} isLoggedIn={isLoggedIn} layout="row" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos.map((repo) => (
            <RepoCard key={repo.id || repo.full_name} repo={repo} isLoggedIn={isLoggedIn} layout="card" />
          ))}
        </div>
      )}
    </section>
  );
}
