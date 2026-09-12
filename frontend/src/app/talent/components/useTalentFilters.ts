import { useMemo } from "react";
import type { CandidateProfile } from "../TalentClient";

export type TalentSortKey = "featured" | "karma" | "merged-prs";

export const TALENT_LANGUAGES = ["All", "Go", "TypeScript", "Rust", "Python", "C++"];

export interface TalentFilterInput {
  candidates: CandidateProfile[];
  searchQuery: string;
  selectedLang: string;
  selectedMinKarma: number;
  openToWorkOnly: boolean;
  sortKey: TalentSortKey;
  page: number;
  /** Use Number.POSITIVE_INFINITY to show all results (default). */
  pageSize: number;
}

export interface TalentFilterResult {
  filteredCandidates: CandidateProfile[];
  sortedCandidates: CandidateProfile[];
  paginatedCandidates: CandidateProfile[];
  totalCount: number;
  totalPages: number;
}

export function useTalentFilters({
  candidates,
  searchQuery,
  selectedLang,
  selectedMinKarma,
  openToWorkOnly,
  sortKey,
  page,
  pageSize,
}: TalentFilterInput): TalentFilterResult {
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (openToWorkOnly && !c.open_to_work) return false;
      if (selectedLang !== "All" && c.primary_language !== selectedLang && !c.languages.includes(selectedLang)) {
        return false;
      }
      if (selectedMinKarma > 0 && c.total_karma < selectedMinKarma) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesUsername = c.username.toLowerCase().includes(q);
        const matchesHeadline = c.headline.toLowerCase().includes(q);
        const matchesBio = c.bio.toLowerCase().includes(q);
        const matchesRepos = c.top_repos.some((r) => r.toLowerCase().includes(q));
        const matchesLang = c.languages.some((l) => l.toLowerCase().includes(q));
        if (!matchesName && !matchesUsername && !matchesHeadline && !matchesBio && !matchesRepos && !matchesLang) {
          return false;
        }
      }
      return true;
    });
  }, [candidates, searchQuery, selectedLang, selectedMinKarma, openToWorkOnly]);

  const sortedCandidates = useMemo(() => {
    if (sortKey === "karma") {
      return [...filteredCandidates].sort((a, b) => b.total_karma - a.total_karma);
    }
    if (sortKey === "merged-prs") {
      return [...filteredCandidates].sort((a, b) => b.merged_prs_count - a.merged_prs_count);
    }
    return filteredCandidates;
  }, [filteredCandidates, sortKey]);

  const { paginatedCandidates, totalPages } = useMemo(() => {
    if (!Number.isFinite(pageSize) || pageSize <= 0) {
      return { paginatedCandidates: sortedCandidates, totalPages: 1 };
    }
    const pages = Math.max(1, Math.ceil(sortedCandidates.length / pageSize));
    const safePage = Math.min(Math.max(1, page), pages);
    const start = (safePage - 1) * pageSize;
    return { paginatedCandidates: sortedCandidates.slice(start, start + pageSize), totalPages: pages };
  }, [sortedCandidates, page, pageSize]);

  return {
    filteredCandidates,
    sortedCandidates,
    paginatedCandidates,
    totalCount: filteredCandidates.length,
    totalPages,
  };
}
