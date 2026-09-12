import { useState, useEffect, useCallback } from "react";

export const STORAGE_KEY = "opendoor_first_merge_track_v1";

export interface FirstMergeTrackState {
  step: 1 | 2 | 3 | 4;
  selectedRepo: {
    id: string;
    fullName: string;
    language?: string;
    cRankTier?: string;
    cRankScore?: number;
  } | null;
  claimedIssue: {
    id: number | string;
    title: string;
    url: string;
    issueNumber?: number;
  } | null;
  preflightEvaluation: {
    evalId?: string;
    overallScore: number;
    readyToMerge: boolean;
    passedChecksCount: number;
    totalChecksCount: number;
    evaluatedAt: string;
  } | null;
  trackedPR: {
    prId: string;
    prNumber: number;
    title: string;
    htmlUrl: string;
    state: "open" | "changes_requested" | "approved" | "merged" | "closed";
  } | null;
  updatedAt: number;
}

export const DEFAULT_STATE: FirstMergeTrackState = {
  step: 1,
  selectedRepo: null,
  claimedIssue: null,
  preflightEvaluation: null,
  trackedPR: null,
  updatedAt: Date.now(),
};

let inMemoryState: FirstMergeTrackState = { ...DEFAULT_STATE };

export function loadPersistedState(): FirstMergeTrackState {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return inMemoryState;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return inMemoryState;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.step === "number") {
      return parsed;
    }
  } catch {
    // Fallback on error (e.g. private browsing storage restricted)
  }
  return inMemoryState;
}

export function savePersistedState(state: FirstMergeTrackState) {
  inMemoryState = state;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Graceful fallback
  }
}

export function useFirstMergePersistence() {
  const [trackState, setTrackState] = useState<FirstMergeTrackState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initial = loadPersistedState();
    setTrackState(initial);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const remoteState: FirstMergeTrackState = JSON.parse(e.newValue);
          setTrackState((prev) => {
            if (remoteState.updatedAt > (prev.updatedAt || 0) || remoteState.step > prev.step) {
              return remoteState;
            }
            return prev;
          });
        } catch {
          // ignore parsing error
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const updateTrackState = useCallback(
    (updater: (prev: FirstMergeTrackState) => FirstMergeTrackState) => {
      setTrackState((prev) => {
        const next = updater(prev);
        const updated: FirstMergeTrackState = {
          ...next,
          updatedAt: Date.now(),
        };
        savePersistedState(updated);
        return updated;
      });
    },
    []
  );

  return { trackState, setTrackState, updateTrackState, mounted };
}
