"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import posthog from "posthog-js";
import { SelectedRepo } from "../components/compareTypes";

function toSelectedRepo(r: Repo): SelectedRepo {
  const [owner, name] = r.full_name ? r.full_name.split("/") : ["", ""];
  return {
    full_name: r.full_name,
    owner: r.owner || owner,
    name: r.name || name,
    language: r.language,
    stars: r.stars,
    c_rank_tier: r.c_rank_tier || r.class_rank || "A",
    class_rank: r.class_rank || r.c_rank_tier || "A",
    c_rank_score: r.c_rank_score,
    description: r.description,
  };
}

function fallbackRepo(fullName: string): SelectedRepo | null {
  const parts = fullName.split("/");
  if (parts.length !== 2) return null;
  return {
    full_name: fullName,
    owner: parts[0],
    name: parts[1],
    language: "Code",
    stars: 0,
    c_rank_tier: "A",
  };
}

export function useCompareSelection(initialA: string, initialB: string) {
  const [repoA, setRepoA] = useState<SelectedRepo | null>(null);
  const [repoB, setRepoB] = useState<SelectedRepo | null>(null);

  const [queryA, setQueryA] = useState(initialA);
  const [queryB, setQueryB] = useState(initialB);

  const [resultsA, setResultsA] = useState<Repo[]>([]);
  const [resultsB, setResultsB] = useState<Repo[]>([]);

  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const [openDropdownA, setOpenDropdownA] = useState(false);
  const [openDropdownB, setOpenDropdownB] = useState(false);

  const dropdownRefA = useRef<HTMLDivElement | null>(null);
  const dropdownRefB = useRef<HTMLDivElement | null>(null);

  const fetchRepoByExactName = useCallback(
    async (fullName: string): Promise<SelectedRepo | null> => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        const rawList = data.data || data.repos;
        if (Array.isArray(rawList) && rawList.length > 0) {
          const found =
            rawList.find(
              (r: Repo) =>
                r.full_name.toLowerCase() === fullName.toLowerCase()
            ) || rawList[0];
          return toSelectedRepo(found);
        }
        return fallbackRepo(fullName);
      } catch {
        return fallbackRepo(fullName);
      }
    },
    []
  );

  // Pre-fill slot A on initial load if ?a= is present
  useEffect(() => {
    if (initialA) {
      fetchRepoByExactName(initialA).then((repo) => {
        if (repo) {
          setRepoA(repo);
          setQueryA("");
        }
      });
    }
  }, [initialA, fetchRepoByExactName]);

  // Pre-fill slot B on initial load if ?b= is present
  useEffect(() => {
    if (initialB) {
      fetchRepoByExactName(initialB).then((repo) => {
        if (repo) {
          setRepoB(repo);
          setQueryB("");
        }
      });
    }
  }, [initialB, fetchRepoByExactName]);

  // Debounced search for slot A
  useEffect(() => {
    if (!queryA.trim() || repoA) {
      setResultsA([]);
      setLoadingA(false);
      return;
    }

    setLoadingA(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(queryA.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setResultsA(data.data || data.repos || []);
        }
      } catch (err) {
        console.error("Search A error:", err);
      } finally {
        setLoadingA(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [queryA, repoA]);

  // Debounced search for slot B
  useEffect(() => {
    if (!queryB.trim() || repoB) {
      setResultsB([]);
      setLoadingB(false);
      return;
    }

    setLoadingB(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(queryB.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setResultsB(data.data || data.repos || []);
        }
      } catch (err) {
        console.error("Search B error:", err);
      } finally {
        setLoadingB(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [queryB, repoB]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRefA.current &&
        !dropdownRefA.current.contains(e.target as Node)
      ) {
        setOpenDropdownA(false);
      }
      if (
        dropdownRefB.current &&
        !dropdownRefB.current.contains(e.target as Node)
      ) {
        setOpenDropdownB(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectA = (r: Repo) => {
    setRepoA(toSelectedRepo(r));
    setQueryA("");
    setOpenDropdownA(false);
    posthog.capture("compare_repo_selected", { slot: "A", repo: r.full_name });
  };

  const handleSelectB = (r: Repo) => {
    setRepoB(toSelectedRepo(r));
    setQueryB("");
    setOpenDropdownB(false);
    posthog.capture("compare_repo_selected", { slot: "B", repo: r.full_name });
  };

  return {
    repoA,
    setRepoA,
    repoB,
    setRepoB,
    queryA,
    setQueryA,
    queryB,
    setQueryB,
    resultsA,
    resultsB,
    loadingA,
    loadingB,
    openDropdownA,
    setOpenDropdownA,
    openDropdownB,
    setOpenDropdownB,
    dropdownRefA,
    dropdownRefB,
    handleSelectA,
    handleSelectB,
  };
}
