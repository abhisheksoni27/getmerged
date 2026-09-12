"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import posthog from "posthog-js";
import { API_BASE_URL } from "@/lib/api";
import { WatchedRepoItem } from "./watchlistTypes";

export function useWatchlistData(initialItems: WatchedRepoItem[]) {
  const [items, setItems] = useState<WatchedRepoItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<Record<string, boolean>>({});

  const initialCount = initialItems.length;

  useEffect(() => {
    // Sync per-repo alert toggle state (AC3); defaults to on when absent.
    fetch(`${API_BASE_URL}/api/v1/user/watchlist`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.alerts && typeof data.alerts === "object" && !Array.isArray(data.alerts)) {
          setAlerts(data.alerts as Record<string, boolean>);
        }
      })
      .catch(() => {});
  }, [items.length]);

  useEffect(() => {
    // If initial items was empty or needs client refresh, sync with API
    if (initialCount === 0) {
      setLoading(true);
      fetch(`${API_BASE_URL}/api/v1/user/watchlist`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : { watchlist: [] }))
        .then(async (data) => {
          const ids: string[] = data.watchlist || [];
          if (ids.length === 0) {
            setItems([]);
            return;
          }
          const loaded = await Promise.all(
            ids.map(async (id) => {
              try {
                const [rRes, hRes] = await Promise.all([
                  fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(id)}`),
                  fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(id)}/history`),
                ]);
                const repo = rRes.ok ? await rRes.json() : null;
                const historyData = hRes.ok ? await hRes.json() : null;
                if (!repo) return null;
                return {
                  repo,
                  history: historyData?.history || [],
                };
              } catch {
                return null;
              }
            })
          );
          setItems(loaded.filter(Boolean) as WatchedRepoItem[]);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [initialCount]);

  const handleUnwatch = useCallback(async (repoId: string, fullName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/watchlist/${encodeURIComponent(repoId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => String(item.repo.id) !== String(repoId) && item.repo.full_name !== fullName));
        posthog.capture("repo_unwatched", { repo_id: repoId, full_name: fullName });
      }
    } catch (e) {
      console.error("Failed to unwatch repo", e);
    }
  }, []);

  const handleToggleAlerts = useCallback(async (repoId: string, enabled: boolean): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/watchlist/${encodeURIComponent(repoId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notify_rank_change: enabled }),
      });
      if (!res.ok) return false;
      setAlerts((prev) => ({ ...prev, [repoId]: enabled }));
      posthog.capture("watchlist_alerts_toggled", { repo_id: repoId, enabled });
      return true;
    } catch (e) {
      console.error("Failed to toggle watchlist alerts", e);
      return false;
    }
  }, []);

  const showLoading = useMemo(() => loading && items.length === 0, [loading, items.length]);
  const hasItems = useMemo(() => items.length > 0, [items.length]);
  const savedCount = useMemo(() => items.length, [items.length]);

  return { items, loading, alerts, showLoading, hasItems, savedCount, handleUnwatch, handleToggleAlerts };
}
