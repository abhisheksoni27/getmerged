"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import type { DashboardData, MeInfo } from "../components/types";
import { copyToClipboard } from "../components/dashboard-utils";

export interface DashboardToast {
  kind: "success" | "error";
  msg: string;
}

// AC4: navigator.share when available AND in a secure context; clipboard
// guarded by the same check; execCommand fallback; never a DOMException crash.
async function shareOrCopy(url: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator.share === "function" && window.isSecureContext) {
      await navigator.share({
        title: "My GetMerged contributor track record",
        text: "Verify my PR forecast track record on GetMerged:",
        url,
      });
      return "shared";
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "shared";
    // fall through to clipboard fallbacks
  }
  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return "copied";
    }
  } catch {
    // fall through to execCommand fallback / visible URL
  }
  try {
    await copyToClipboard(url);
    return "copied";
  } catch {
    return "failed";
  }
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeInfo | null>(null);
  const [sharing, setSharing] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [toast, setToast] = useState<DashboardToast | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setMe(json?.user ?? null);
      } catch {
        // profile sharing degrades silently; tracker data is independent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // AC2: Share profile flow - prompt to go public first when needed, then
  // share/copy /u/<username>. Copy failure surfaces a visible URL (AC4).
  async function setProfileVisibility(isPublic: boolean): Promise<void> {
    setUpdatingVisibility(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/profile-visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_public: isPublic }),
      });
      if (!res.ok) throw new Error("Failed to update profile visibility");
      setMe((prev) => (prev ? { ...prev, is_public: isPublic } : prev));
      setToast({
        kind: "success",
        msg: isPublic ? "Profile is now public" : "Profile is now private",
      });
    } catch (e) {
      setToast({ kind: "error", msg: e instanceof Error ? e.message : "Could not update visibility" });
    } finally {
      setUpdatingVisibility(false);
    }
  }

  async function shareProfile() {
    if (sharing) return;
    const slug = me?.slug || (me?.username ? me.username.toLowerCase() : "");
    if (!slug) {
      setToast({ kind: "error", msg: "Profile unavailable - try reloading the page." });
      return;
    }
    setSharing(true);
    try {
      if (!me?.is_public) {
        const ok = window.confirm(
          "Make profile public?\n\nYour PR forecast track record (evals, accuracy and merged repos) will be visible to anyone with your link. You can change this later in settings."
        );
        if (!ok) return;
        await setProfileVisibility(true);
      }
      const url = `${window.location.origin}/u/${encodeURIComponent(slug)}`;
      const result = await shareOrCopy(url);
      if (result === "shared") {
        setToast({ kind: "success", msg: "Profile shared" });
      } else if (result === "copied") {
        setToast({ kind: "success", msg: "Profile link copied to clipboard" });
      } else {
        setToast({ kind: "error", msg: `Copy failed - your link: ${url}` });
      }
    } catch (e) {
      setToast({ kind: "error", msg: e instanceof Error ? e.message : "Could not share profile link" });
    } finally {
      setSharing(false);
    }
  }

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/prs${refresh ? "?refresh=1" : ""}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        setUnauthorized(true);
        setError(null);
        return;
      }
      if (!res.ok) throw new Error(`Failed to load PR tracker (${res.status})`);
      setData(await res.json());
      setUnauthorized(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PR tracker");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial render: serve stored snapshots immediately (fast), then trigger
    // a background refresh at most once per day. Without this, the first
    // request would carry ?refresh=1, forcing a live GitHub GraphQL sync
    // that can take 30-40s on every page load.
    load(false);
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().slice(0, 10);
      const lastSyncDate = window.localStorage.getItem("dashboard_last_sync_date");
      if (lastSyncDate !== today) {
        const t = setTimeout(() => {
          load(true);
          window.localStorage.setItem("dashboard_last_sync_date", today);
        }, 1500);
        return () => clearTimeout(t);
      }
    }
  }, [load]);

  async function reconnect() {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/prs/reconnect`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        await load(true);
      } else {
        window.location.href = `${API_BASE_URL}/api/v1/auth/github`;
      }
    } finally {
      setRefreshing(false);
    }
  }

  return {
    data,
    loading,
    refreshing,
    error,
    unauthorized,
    me,
    sharing,
    updatingVisibility,
    toast,
    load,
    reconnect,
    setProfileVisibility,
    shareProfile,
  };
}
