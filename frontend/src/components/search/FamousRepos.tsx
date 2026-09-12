"use client";

import React from "react";
import { FAMOUS_REPOS } from "@/lib/github-search";
import { SearchRow } from "./SearchRow";

interface FamousReposProps {
  onPick: (term: string) => void;
  limit?: number;
}

export function FamousRepos({ onPick, limit = 6 }: FamousReposProps) {
  return (
    <div className="p-3">
      <div className="text-[11px] font-mono font-semibold text-zinc-300 px-2 pb-2">
        Popular Repositories
      </div>
      <div className="flex flex-wrap gap-1.5 px-2">
        {FAMOUS_REPOS.slice(0, limit).map((term) => (
          <SearchRow key={term} kind="shortcut" term={term} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}
