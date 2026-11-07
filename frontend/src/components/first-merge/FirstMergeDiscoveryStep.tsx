import React from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, Search, Sparkles } from "lucide-react";
import { MatchRepoItem } from "@/hooks/useFirstMergeMatches";
import { StepShell } from "./FirstMergeStepShell";

interface FirstMergeDiscoveryStepProps {
  matches: MatchRepoItem[];
  loadingMatches: boolean;
  onSelectRepo: (repo: MatchRepoItem) => void;
}

export function FirstMergeDiscoveryStep({
  matches,
  loadingMatches,
  onSelectRepo,
}: FirstMergeDiscoveryStepProps) {
  return (
    <StepShell
      icon={<Sparkles className="h-4 w-4 text-amber-500" />}
      title="Step 1: Pick a Welcoming Repo"
      description="Select a repository with high first-timer merge rates and responsive maintainers."
      action={
        <Link prefetch={false}
          href="/repos"
          className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
        >
          Browse all repos <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >

      {loadingMatches ? (
        <div className="mt-4 py-8 text-center text-xs text-[var(--text-secondary)] animate-pulse">
          Finding highest-fit repositories for you...
        </div>
      ) : matches.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-secondary)]">
          No recommendations found yet. Search any welcoming repository to get started.
          <div className="mt-2">
            <Link prefetch={false}
              href="/repos"
              className="inline-flex items-center gap-1 rounded-md glass-card px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-zinc-800"
            >
              <Search className="h-3.5 w-3.5" /> Explore Repositories
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {matches.slice(0, 3).map((m) => (
            <div
              key={m.id || m.full_name}
              className="flex flex-col justify-between rounded-lg border border-[var(--border-subtle)] glass-card/50 p-3.5 hover:border-emerald-400 hover:glass-panel transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <span className="truncate text-xs font-bold text-[var(--text-primary)]" title={m.full_name}>
                    {m.full_name}
                  </span>
                  {m.c_rank_tier && (
                    <span className="shrink-0 rounded glass-card px-1.5 py-0.2 text-[10px] font-bold text-[var(--text-primary)]">
                      {m.c_rank_tier}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-[var(--text-secondary)]">
                  {m.description || "Active community with beginner friendly issues."}
                </p>
                {m.reasons && m.reasons.length > 0 && (
                  <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                    <Check className="h-3 w-3 shrink-0" /> {m.reasons[0]}
                  </div>
                )}
              </div>

              <button
                onClick={() => onSelectRepo(m)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
              >
                Select & Claim Issue <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </StepShell>
  );
}
