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
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.1] glass-panel text-zinc-300 shadow-2xs transition-colors hover:text-white hover:glass-card"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#faf9f6]">
            {formatBadge(unread)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] max-w-[92vw] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#141414] shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.1] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-sans text-sm font-semibold text-white">
                Notifications
              </span>
              {live && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-950/70 border-emerald-800/80 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> live
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Notification settings"
                onClick={() => setShowPrefs((s) => !s)}
                className="rounded-lg p-1.5 text-zinc-300 hover:glass-card hover:text-zinc-200"
              >
                <Settings2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Mark all read"
                onClick={() => void markRead([], true)}
                className="rounded-lg p-1.5 text-zinc-300 hover:glass-card hover:text-zinc-200"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Close"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-300 hover:glass-card hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showPrefs && (
            <div className="border-b border-white/[0.1] glass-card/60 px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
                In-app notifications
              </p>
              <div className="space-y-1.5">
                {CATEGORIES.map((cat) => {
                  const on = isEnabled(prefs, cat);
                  return (
                    <label
                      key={cat}
                      className="flex cursor-pointer items-center justify-between gap-3 text-xs text-zinc-300"
                    >
                      <span>{CATEGORY_LABELS[cat].label}</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-zinc-900"
                        checked={on}
                        disabled={prefsBusy}
                        onChange={() => togglePref(cat)}
                      />
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-zinc-300">
                In-app alerts are independent of email, Slack &amp; Discord.
              </p>
              <Link
                href="/settings/notifications"
                onClick={() => setOpen(false)}
                className="mt-1 inline-block text-[10px] font-medium text-zinc-300 underline hover:text-zinc-200"
              >
                Manage all notification settings
              </Link>
            </div>
          )}

          {upgradeAvailable && (
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 bg-amber-950/70 border-amber-800/80 px-4 py-2 text-[11px] font-medium text-amber-700 hover:bg-amber-950/80 border-amber-800/80"
            >
              <Zap className="h-3.5 w-3.5" />
              Upgrade for instant notifications
            </Link>
          )}

          <div className="max-h-[420px] overflow-y-auto">
            {error ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <p className="text-sm text-zinc-300">Couldn&apos;t load notifications.</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="rounded-lg glass-card px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-zinc-300">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {items.map((n) => (
                  <li key={n.id}>
                    {n.payload.link_url ? (
                      <Link
                        href={n.payload.link_url}
                        onClick={() => onItemClick(n.id, n.payload.link_url || "")}
                        className="block px-4 py-3 transition-colors hover:glass-card"
                      >
                        <NotificationRow n={n} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onItemClick(n.id, "")}
                        className="block w-full px-4 py-3 text-left transition-colors hover:glass-card"
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
            <div className="border-t border-white/[0.1] px-4 py-2 text-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loading}
                className="text-xs font-medium text-zinc-300 hover:text-white"
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
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-rose-400"}`}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{n.payload.title}</p>
        <p className="line-clamp-2 text-xs text-zinc-300">{n.payload.message}</p>
        <p className="mt-0.5 text-[10px] text-zinc-300">{timeAgo(n.created_at)}</p>
      </div>
    </div>
  );
}
