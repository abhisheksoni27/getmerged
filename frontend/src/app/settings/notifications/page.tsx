"use client";

import React, { useEffect, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  fetchPreferences,
  isEnabled,
  NotificationCategory,
  NotificationPreferences,
  setEnabled,
  updatePreferences,
} from "@/lib/notifications";

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    void fetchPreferences().then((p) => {
      if (p) setPrefs(p);
      else setError(true);
    });
  }, []);

  const toggle = async (cat: NotificationCategory) => {
    if (!prefs) return;
    const next = setEnabled(prefs, cat, !isEnabled(prefs, cat));
    setPrefs(next);
    setBusy(true);
    setSaved(false);
    const res = await updatePreferences(next);
    setBusy(false);
    if (res) {
      setPrefs(res);
      setSaved(true);
    } else {
      setError(true);
    }
  };

  if (!prefs) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-sm text-zinc-400">
          {error ? "Couldn't load preferences." : "Loading…"}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-space text-2xl font-bold text-zinc-100">
        Notification preferences
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        In-app alerts are independent of email, Slack &amp; Discord. Muted
        categories are excluded from your feed and live stream.
        {saved && <span className="ml-2 text-emerald-600">Saved.</span>}
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111827]">
        {CATEGORIES.map((cat, i) => {
          const on = isEnabled(prefs, cat);
          return (
            <div
              key={cat}
              className={`flex items-center justify-between gap-4 px-4 py-4 ${i > 0 ? "border-t border-white/[0.08]" : ""}`}
            >
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  {CATEGORY_LABELS[cat].label}
                </p>
                <p className="text-xs text-zinc-400">{CATEGORY_LABELS[cat].hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                disabled={busy}
                onClick={() => toggle(cat)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[#1e293b]" : "bg-zinc-300"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#111827] shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
