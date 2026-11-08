"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bell, Check, Settings2, X, Zap } from "lucide-react";
import Link from "next/link";
import { User } from "@/types/opendoor";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  fetchPreferences,
  formatBadge,
  isEnabled,
  NotificationCategory,
  NotificationPreferences,
  setEnabled,
  updatePreferences,
  useNotificationCenter,
} from "@/lib/notifications";

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationBell({ user }: { user: User | null }) {
  const enabled = Boolean(user);
  const {
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
  } = useNotificationCenter(enabled);
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !enabled) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, enabled]);

  useEffect(() => {
    if (open && enabled && !prefs) {
      void fetchPreferences().then((p) => p && setPrefs(p));
    }
  }, [open, enabled, prefs]);

  if (!enabled) return null;

  const togglePref = async (cat: NotificationCategory) => {
    if (!prefs) return;
    const next = setEnabled(prefs, cat, !isEnabled(prefs, cat));
    setPrefs(next);
    setPrefsBusy(true);
    const saved = await updatePreferences(next);
    setPrefsBusy(false);
    if (saved) setPrefs(saved);
  };

  const onItemClick = (id: number, link: string) => {
    void markRead([id]);
    if (link) {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Notifications"
        aria-label="Open notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
      >
        <Bell className="h-3.5 w-3.5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-[var(--text-primary)] ring-2 ring-[var(--bg-canvas)]">
            {formatBadge(unread)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] max-w-[92vw] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-sans text-sm font-semibold text-[var(--text-primary)]">
                Notifications
              </span>
              {live && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-[#0D9668]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> live
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Notification settings"
                onClick={() => setShowPrefs((s) => !s)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                <Settings2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Mark all read"
                onClick={() => void markRead([], true)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Close"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showPrefs && (
            <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                In-app notifications
              </p>
              <div className="space-y-1.5">
                {CATEGORIES.map((cat) => {
                  const on = isEnabled(prefs, cat);
                  return (
                    <label
                      key={cat}
                      className="flex cursor-pointer items-center justify-between gap-3 text-xs text-[var(--text-secondary)]"
                    >
                      <span>{CATEGORY_LABELS[cat].label}</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--brand-terracotta)]"
                        checked={on}
                        disabled={prefsBusy}
                        onChange={() => togglePref(cat)}
                      />
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                In-app alerts are independent of email, Slack &amp; Discord.
              </p>
              <Link prefetch={false}
                href="/settings/notifications"
                onClick={() => setOpen(false)}
                className="mt-1 inline-block text-[10px] font-medium text-[var(--brand-terracotta)] underline hover:text-[var(--text-primary)]"
              >
                Manage all notification settings
              </Link>
            </div>
          )}

          <div className="max-h-[420px] overflow-y-auto">
            {error ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <p className="text-sm text-[var(--text-secondary)]">Couldn&apos;t load notifications.</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-subtle)]"
                >
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-[var(--text-muted)]">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {items.map((n) => (
                  <li key={n.id}>
                    {n.payload.link_url ? (
                      <Link prefetch={false}
                        href={n.payload.link_url}
                        onClick={() => onItemClick(n.id, n.payload.link_url || "")}
                        className="block px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"
                      >
                        <NotificationRow n={n} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onItemClick(n.id, "")}
                        className="block w-full px-4 py-3 text-left transition-colors hover:bg-[var(--bg-elevated)]"
                      >
                        <NotificationRow n={n} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasMore && !error && (
            <div className="border-t border-[var(--border-subtle)] px-4 py-2 text-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loading}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({ n }: { n: { payload: { title: string; message: string }; created_at: string; read: boolean } }) {
  return (
    <div className="flex gap-3">
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-[#C4463A]"}`}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{n.payload.title}</p>
        <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">{n.payload.message}</p>
        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{timeAgo(n.created_at)}</p>
      </div>
    </div>
  );
}
