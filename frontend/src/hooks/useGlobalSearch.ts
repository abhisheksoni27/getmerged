"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { API_BASE_URL } from "@/lib/api";
import { FAMOUS_REPOS, parseGitHubInput } from "@/lib/github-search";
import { Repo } from "@/types/opendoor";

interface UseGlobalSearchOptions {
  isOpen: boolean;
  searchQuery: string;
  onNavigate: (fullName: string) => void;
  onClose: () => void;
}

export function useGlobalSearch({ isOpen, searchQuery, onNavigate, onClose }: UseGlobalSearchOptions) {
  const [results, setResults] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const selectedIndexRef = useRef<number>(-1);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Cycling placeholder text
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % FAMOUS_REPOS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Fetch search results from API
  const fetchResults = useCallback(async (query: string) => {
    const parsed = parseGitHubInput(query);
    if (!parsed) {
      setResults([]);
      selectedIndexRef.current = -1;
      setSelectedIndex(-1);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(parsed)}&per_page=10`);
      if (!res.ok) throw new Error("Search request failed");
      const data = await res.json();
      const rawList = data.data || data.repos;

      if (Array.isArray(rawList)) {
        const mappedList: Repo[] = rawList.map((r: Record<string, unknown>) => ({
          ...(r as unknown as Repo),
          c_rank_tier: (r.c_rank_tier as string) || (r.class_rank as string) || "A",
          class_rank: (r.class_rank as string) || (r.c_rank_tier as string) || "A",
          first_timer_success_rate:
            (r.first_timer_success_rate as number) !== undefined
              ? (r.first_timer_success_rate as number)
              : (r.first_timer_rate as number),
        }));
        setResults(mappedList);
        setSelectedIndex(selectedIndexRef.current);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Failed to search repos", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger search on query change (debounced)
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      fetchResults(searchQuery);
      if (searchQuery.trim()) {
        posthog.capture("repo_searched", { query: searchQuery.trim(), source: "global_search" });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, fetchResults]);

  // Autofocus input and reset selection when modal opens; clean up on close
  useEffect(() => {
    if (isOpen) {
      selectedIndexRef.current = -1;
      setSelectedIndex(-1);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
      selectedIndexRef.current = -1;
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      if (results.length === 0) return;
      const current = selectedIndexRef.current;
      const next =
        direction === 1
          ? current < results.length - 1
            ? current + 1
            : 0
          : current > 0
          ? current - 1
          : results.length - 1;
      selectedIndexRef.current = next;
      setSelectedIndex(next);
    },
    [results.length]
  );

  const submitSelection = useCallback(() => {
    const currIndex = selectedIndexRef.current;
    const targetRepo =
      currIndex >= 0 && currIndex < results.length
        ? results[currIndex]
        : results.length > 0
        ? results[0]
        : null;
    if (targetRepo) {
      onClose();
      onNavigate(targetRepo.full_name);
    } else {
      const parsed = parseGitHubInput(searchQuery);
      if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(parsed)) {
        onClose();
        onNavigate(parsed);
      }
    }
  }, [results, searchQuery, onClose, onNavigate]);

  const trapFocus = useCallback((e: React.KeyboardEvent) => {
    if (!modalRef.current) return;
    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  // Handle keyboard navigation within modal (Tab trap, Arrow keys, Enter)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        submitSelection();
      } else if (e.key === "Tab") {
        trapFocus(e);
      }
    },
    [moveSelection, submitSelection, trapFocus]
  );

  return {
    results,
    setResults,
    loading,
    selectedIndex,
    setSelectedIndex,
    selectedIndexRef,
    placeholderIndex,
    inputRef,
    modalRef,
    handleKeyDown,
  };
}
