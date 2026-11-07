"use client";

import React from "react";
import Link from "next/link";
import { Repo } from "@/types/opendoor";

export type SearchRowKind = "repo" | "shortcut";

type SearchRowProps =
  | {
      kind: "repo";
      repo: Repo;
      index: number;
      rowId: string;
      isSelected: boolean;
      onHover: (index: number) => void;
      onSelect: (repo: Repo) => void;
    }
  | {
      kind: "shortcut";
      term: string;
      onPick: (term: string) => void;
    };

export function SearchRow(props: SearchRowProps) {
  if (props.kind === "shortcut") {
    const { term, onPick } = props;
    return (
      <button
        key={term}
        type="button"
        onClick={() => onPick(term)}
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] cursor-pointer transition-all"
      >
        {term}
      </button>
    );
  }

  const { repo, index, rowId, isSelected, onHover, onSelect } = props;
  return (
    <Link prefetch={false}
      key={repo.id || repo.full_name}
      id={rowId}
      role="option"
      aria-selected={isSelected}
      href={`/${repo.full_name}`}
      onClick={() => onSelect(repo)}
      onMouseEnter={() => onHover(index)}
      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
        isSelected ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] border-l-2 border-[var(--color-primary)]" : "hover:bg-[var(--bg-elevated)]/60 text-[var(--text-secondary)]"
      }`}
    >
      <div className="flex flex-col min-w-0 pr-3">
        <span className="text-sm font-semibold font-mono text-[var(--text-primary)] truncate">{repo.full_name}</span>
        {repo.description && (
          <span className="text-xs text-[var(--text-secondary)] font-sans truncate mt-0.5 max-w-md">
            {repo.description}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {repo.language && (
          <span className="text-xs font-mono text-[var(--text-secondary)] px-2.5 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            {repo.language}
          </span>
        )}
        <span
          className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg ${
            repo.c_rank_tier === "S"
              ? "bg-[#0D9668]/10 text-[#0D9668] border border-[#0D9668]/30"
              : repo.c_rank_tier === "A"
              ? "bg-[#2D8ABF]/10 text-[#2D8ABF] border border-[#2D8ABF]/30"
              : repo.c_rank_tier === "B"
              ? "bg-[#8B6BB5]/10 text-[#8B6BB5] border border-[#8B6BB5]/30"
              : "bg-[#C4910A]/10 text-[#C4910A] border border-[#C4910A]/30"
          }`}
        >
          {repo.c_rank_tier || "A"}
        </span>
      </div>
    </Link>
  );
}
