"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { ProgressResponse, getEventPhase } from "./hacktoberfestTypes";

export function useHacktoberfestProgress() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isNudging, setIsNudging] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);

  const lastNudgeTimeRef = useRef<number>(0);

  const fetchProgress = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/hacktoberfest/progress`, {
        credentials: "include",
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (res.ok) {
        setIsAuthenticated(true);
        const data: ProgressResponse = await res.json();
        setProgress(data);
      }
    } catch (e) {
      console.error("Failed to fetch Hacktoberfest progress:", e);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  const triggerNudge = useCallback(async () => {
    const now = Date.now();
    // Throttle client-side nudge triggers to <= 1 per minute (AC3)
    if (now - lastNudgeTimeRef.current < 60000) {
      return;
    }
    lastNudgeTimeRef.current = now;
    setIsNudging(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hacktoberfest/nudge`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data: ProgressResponse = await res.json();
        setProgress(data);
      }
    } catch (e) {
      console.error("Failed to nudge Hacktoberfest progress:", e);
    } finally {
      setIsNudging(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on page load (AC2, AC3)
    fetchProgress(true);

    // AC2/AC5: Poll every 5 minutes while the tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchProgress(false);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchProgress]);

  // Connect to PR merge eventstream for display hints (AC2, AC3)
  useEffect(() => {
    if (!isAuthenticated) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${API_BASE_URL}/api/v1/eventstream`, {
        withCredentials: true,
      });

      eventSource.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          // Stream event is display-hint only, triggers throttled re-poll (AC2, AC3)
          if (payload?.type === "pr_merged" || payload?.type === "pr_update" || payload?.action === "merged") {
            triggerNudge();
          }
        } catch {
          // ignore non-json keepalives
        }
      };

      eventSource.onerror = () => {
        // SSE fallback: safely closes and relies on 5-min lazy poll (AC2)
        if (eventSource) {
          eventSource.close();
        }
      };
    } catch (e) {
      console.warn("EventSource setup skipped:", e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isAuthenticated, triggerNudge]);

  const handleCopyShareLink = useCallback(async (shareUrl: string) => {
    const fullUrl = `${window.location.origin}${shareUrl}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      }
      setCopiedCard(true);
      setTimeout(() => setCopiedCard(false), 2500);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
    }
  }, []);

  const derived = useMemo(() => {
    const mergedCount = progress?.merged_count ?? 0;
    const target = progress?.target ?? 4;
    const progressPercent = Math.min(100, Math.round((mergedCount / target) * 100));
    const phase = getEventPhase();
    return { mergedCount, target, progressPercent, phase };
  }, [progress]);

  return {
    progress,
    loading,
    isAuthenticated,
    isNudging,
    copiedCard,
    mergedCount: derived.mergedCount,
    target: derived.target,
    progressPercent: derived.progressPercent,
    phase: derived.phase,
    fetchProgress,
    triggerNudge,
    handleCopyShareLink,
  };
}
