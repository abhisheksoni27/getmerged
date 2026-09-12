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
        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/[0.08] cursor-pointer transition-all"
      >
        {term}
      </button>
    );
  }

  const { repo, index, rowId, isSelected, onHover, onSelect } = props;
  return (
    <Link
      key={repo.id || repo.full_name}
      id={rowId}
      role="option"
      aria-selected={isSelected}
      href={`/${repo.full_name}`}
      onClick={() => onSelect(repo)}
      onMouseEnter={() => onHover(index)}
      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
        isSelected ? "bg-white/[0.08] text-white" : "hover:bg-white/[0.04] text-zinc-300"
      }`}
    >
      <div className="flex flex-col min-w-0 pr-3">
        <span className="text-sm font-semibold font-mono text-white truncate">{repo.full_name}</span>
        {repo.description && (
          <span className="text-xs text-zinc-300 font-sans truncate mt-0.5 max-w-md">
            {repo.description}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {repo.language && (
          <span className="text-[11px] font-mono text-zinc-300 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
            {repo.language}
          </span>
        )}
        <span
          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
            repo.c_rank_tier === "S"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : repo.c_rank_tier === "A"
              ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
              : repo.c_rank_tier === "B"
              ? "bg-violet-500/15 text-violet-400 border border-violet-500/30"
              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
          }`}
        >
          {repo.c_rank_tier || "A"}
        </span>
      </div>
    </Link>
  );
}
