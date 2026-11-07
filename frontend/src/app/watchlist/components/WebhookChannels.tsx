"use client";

import React, { useState, useEffect } from "react";
import { Webhook, AlertTriangle, Trash2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { WatchlistWebhook } from "./watchlistTypes";

export function WebhookChannels() {
  const [webhooks, setWebhooks] = useState<WatchlistWebhook[]>([]);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState<"slack" | "discord">("slack");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/user/watchlist/webhooks`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { webhooks: [] }))
      .then((data) => setWebhooks(data.webhooks || []))
      .catch(() => {});
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/watchlist/webhooks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, label }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.webhook) setWebhooks((prev) => [...prev, data.webhook]);
        setUrl("");
      } else {
        setError(data.error || "Failed to add webhook");
      }
    } catch {
      setError("Failed to add webhook");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/watchlist/webhooks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch {}
  };

  return (
    <div className="mb-8 p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Webhook className="h-4 w-4 text-[#0D9668]" />
        <h2 className="font-space text-base font-bold text-[var(--text-primary)]">Webhook Alerts</h2>
        <span className="text-xs text-[var(--text-secondary)] font-sans">Slack &amp; Discord pings when a watched repo crosses a tier or jumps 10+ C-Rank points</span>
      </div>

      {webhooks.length > 0 && (
        <ul className="flex flex-col gap-2 mb-4">
          {webhooks.map((wh) => (
            <li key={wh.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-[10px] font-mono font-bold uppercase shrink-0">{wh.label}</span>
                <span className="font-mono text-xs text-[var(--text-secondary)] truncate">{wh.url}</span>
                {!wh.enabled && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-[#C4463A] border border-rose-200 font-mono text-[10px] font-semibold shrink-0"
                    title="Auto-disabled after repeated delivery failures - re-add it to resume alerts"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Disabled
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(wh.id)}
                aria-label={`Remove ${wh.label} webhook`}
                title="Remove webhook"
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[#C4463A] hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <select
          value={label}
          onChange={(e) => setLabel(e.target.value as "slack" | "discord")}
          aria-label="Webhook type"
          className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-sans text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-terracotta)]"
        >
          <option value="slack">Slack</option>
          <option value="discord">Discord</option>
        </select>
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          aria-label="Webhook URL"
          className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-sans text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-terracotta)]"
        />
        <button
          type="submit"
          disabled={busy || webhooks.length >= 5}
          title={webhooks.length >= 5 ? "Webhook limit reached (max 5)" : "Add webhook"}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand-terracotta)] text-[var(--text-primary)] text-sm font-sans font-semibold hover:bg-[var(--brand-terracotta)]/90 active:scale-[0.98] transition-all shadow-xs disabled:opacity-40 disabled:pointer-events-none"
        >
          {busy ? "Adding…" : "Add Webhook"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-[#C4463A] font-sans">{error}</p>}
    </div>
  );
}
