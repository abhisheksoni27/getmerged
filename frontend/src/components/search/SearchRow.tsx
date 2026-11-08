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
      className={`flex items-center justify-between px-4 py-2.5 rounded transition-all ${
        isSelected
          ? "bg-[rgba(163,113,247,0.12)] text-[var(--text-primary)] border-l-2 border-[var(--purple-bright)]"
          : "hover:bg-white/5 text-[var(--text-secondary)]"
      }`}
    >
      <div className="flex flex-col min-w-0 pr-3">
        <span className="text-xs font-semibold font-mono text-[var(--text-primary)] truncate">{repo.full_name}</span>
        {repo.description && (
          <span className="text-[11px] text-[var(--text-tertiary)] font-sans truncate mt-0.5 max-w-md">
            {repo.description}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {repo.language && (
          <span className="pill text-[10px]">
            {repo.language}
          </span>
        )}
        <span className={`tier-badge tier-${repo.c_rank_tier || "A"} text-xs h-6 w-6`}>
          {repo.c_rank_tier || "A"}
        </span>
      </div>
    </Link>
  );
}
