import { useCallback, useEffect, useRef, useState } from "react";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";

export type NotificationCategory = "watchlist" | "pr" | "achievement" | "gfi";

export const CATEGORIES: NotificationCategory[] = [
  "watchlist",
  "pr",
  "achievement",
  "gfi",
];

export const CATEGORY_LABELS: Record<
  NotificationCategory,
  { label: string; hint: string }
> = {
  watchlist: {
    label: "Watchlist C-Rank changes",
    hint: "When a watched repo changes tier.",
  },
  pr: {
    label: "PR milestones",
    hint: "When your PR crosses maintainer-response thresholds.",
  },
  achievement: {
    label: "Achievement unlocks",
    hint: "When you earn a new achievement.",
  },
  gfi: {
    label: "Good first issues",
    hint: "When a matched good-first-issue is found.",
  },
};

export interface NotificationPayload {
  title: string;
  message: string;
  link_url?: string;
}

export interface InAppNotification {
  id: number;
  user_id: number;
  category: NotificationCategory;
  payload: NotificationPayload;
  read: boolean;
  created_at: string;
  deliver_at: string;
}

export interface NotificationPreferences {
  user_id?: number;
  muted: NotificationCategory[];
}

export interface NotificationFeed {
  notifications: InAppNotification[];
  next_cursor: string;
  has_more: boolean;
}

// isEnabled reports whether a category is NOT muted (AC10). Muted categories are
// excluded from the feed and SSE by the backend.
export function isEnabled(
  prefs: NotificationPreferences | null,
  cat: NotificationCategory,
): boolean {
  return !prefs?.muted?.includes(cat);
}

// setEnabled returns a new preferences doc with the given category toggled.
export function setEnabled(
  prefs: NotificationPreferences | null,
  cat: NotificationCategory,
  enabled: boolean,
): NotificationPreferences {
  const muted = new Set<NotificationCategory>(prefs?.muted || []);
  if (enabled) muted.delete(cat);
  else muted.add(cat);
  return { user_id: prefs?.user_id, muted: Array.from(muted) };
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
}

export async function fetchNotifications(
  cursor = "",
  limit = 30,
): Promise<NotificationFeed | null> {
  try {
    const res = await authedFetch(
      `/api/notifications?limit=${limit}&cursor=${encodeURIComponent(cursor)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as NotificationFeed;
    return {
      notifications: data.notifications || [],
      next_cursor: data.next_cursor || "",
      has_more: Boolean(data.has_more),
    };
  } catch {
    return null;
  }
}

export interface UnreadResult {
  unread_count: number;
  upgrade_available: boolean;
}

// fetchUnreadCount returns the server-computed unread count plus the upsell flag
// (AC3/AC6). The client never maintains its own counter.
export async function fetchUnreadCount(): Promise<UnreadResult | null> {
  try {
    const res = await authedFetch(`/api/notifications/unread-count`);
    if (!res.ok) return null;
    const data = (await res.json()) as UnreadResult;
    return {
      unread_count: typeof data.unread_count === "number" ? data.unread_count : 0,
      upgrade_available: Boolean(data.upgrade_available),
    };
  } catch {
    return null;
  }
}

export async function markNotificationsRead(
  ids: number[],
  markAll = false,
): Promise<boolean> {
  try {
    const res = await authedFetch(`/api/notifications/mark-read`, {
      method: "POST",
      body: JSON.stringify({ ids, mark_all: markAll }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPreferences(): Promise<NotificationPreferences | null> {
  try {
    const res = await authedFetch(`/api/notifications/preferences`);
    if (!res.ok) return null;
    const data = (await res.json()) as NotificationPreferences;
    return { user_id: data.user_id, muted: data.muted || [] };
  } catch {
    return null;
  }
}

export async function updatePreferences(
  prefs: NotificationPreferences,
): Promise<NotificationPreferences | null> {
  try {
    const res = await authedFetch(`/api/notifications/preferences`, {
      method: "PUT",
      body: JSON.stringify(prefs),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { muted?: NotificationCategory[] };
    return { user_id: prefs.user_id, muted: data.muted || prefs.muted };
  } catch {
    return null;
  }
}

export function formatBadge(count: number): string {
  return count > 99 ? "99+" : String(count);
}

const FREE_POLL_MS = 15 * 60 * 1000;
const PRO_POLL_MS = 60 * 1000;

// useNotificationCenter wires the in-app feed: SSE live stream is the primary
// transport; a resilient polling fallback is used for no-SSE clients and for
// Free-tier users (forced 15m interval). Gap-replay happens implicitly on the
// next poll; the server is the single source of truth for the unread count.
export function useNotificationCenter(enabled: boolean) {
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [cursor, setCursor] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [live, setLive] = useState(false);
  const [upgradeAvailable, setUpgradeAvailable] = useState(false);
  const cursorRef = useRef("");
  const esRef = useRef<EventSource | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const [feed, count] = await Promise.all([
      fetchNotifications(cursorRef.current, 30),
      fetchUnreadCount(),
    ]);
    if (feed) {
      setItems((prev) =>
        cursorRef.current === ""
          ? feed.notifications
          : dedupe([...prev, ...feed.notifications]),
      );
      setCursor(feed.next_cursor);
      setHasMore(feed.has_more);
      setError(false);
    } else {
      setError(true);
    }
    if (count !== null) {
      setUnread(count.unread_count);
      setUpgradeAvailable(count.upgrade_available);
    }
    setLoading(false);
  }, [enabled]);

  const openStream = useCallback(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    if (esRef.current) return;
    const es = new EventSource(`${API_BASE_URL}/api/notifications/stream`, {
      withCredentials: true,
    });
    es.addEventListener("notification", (ev) => {
      try {
        const n = JSON.parse((ev as MessageEvent).data) as InAppNotification;
        setItems((prev) => dedupe([n, ...prev]));
        setUnread((u) => (n.read ? u : u + 1));
      } catch {
        /* ignore malformed frame */
      }
    });
    es.addEventListener("count", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as UnreadResult;
        setUnread(data.unread_count);
        setUpgradeAvailable(data.upgrade_available);
      } catch {
        /* ignore malformed frame */
      }
    });
    es.onopen = () => setLive(true);
    es.onerror = () => {
      // Free tier (or network) → no SSE; poll path already covers delivery.
      setLive(false);
      es.close();
      esRef.current = null;
    };
    esRef.current = es;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    cursorRef.current = "";
    void refresh();
    openStream();
    // Plan-aware polling fallback: Free (upsell) = 15m, otherwise 60s (AC7).
    const pollMs = upgradeAvailable ? FREE_POLL_MS : PRO_POLL_MS;
    const t = setInterval(() => void refresh(), pollMs);
    const sseRetry = setInterval(() => {
      if (!live) openStream();
    }, 5 * 60 * 1000);
    return () => {
      clearInterval(t);
      clearInterval(sseRetry);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [enabled, refresh, openStream, live, upgradeAvailable]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor) return;
    const feed = await fetchNotifications(cursor, 30);
    if (feed) {
      setItems((prev) => dedupe([...prev, ...feed.notifications]));
      setCursor(feed.next_cursor);
      setHasMore(feed.has_more);
    }
  }, [hasMore, cursor]);

  const markRead = useCallback(async (ids: number[], markAll = false) => {
    const ok = await markNotificationsRead(ids, markAll);
    if (!ok) return false;
    if (markAll) {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } else {
      setItems((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)),
      );
      setUnread((u) => Math.max(0, u - ids.length));
    }
    return true;
  }, []);

  return {
    items,
    unread,
    hasMore,
    loading,
    error,
    live,
    upgradeAvailable,
    refresh,
    loadMore,
    markRead,
  };
}

function dedupe(list: InAppNotification[]): InAppNotification[] {
  const seen = new Set<number>();
  const out: InAppNotification[] = [];
  for (const n of list) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n);
  }
  return out;
}
