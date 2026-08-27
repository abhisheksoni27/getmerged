"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { KeyRound, Copy, Check, Trash2, Plus, AlertTriangle } from "lucide-react";

interface APIKey {
  id: number;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface APIKeysData {
  keys: APIKey[];
  is_pro: boolean;
  limits: {
    free_hourly_requests: number;
    free_burst_per_minute: number;
    pro_hourly_requests: number;
    pro_burst_per_minute: number;
  };
}

export function ApiKeysCard() {
  const [data, setData] = useState<APIKeysData | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/api-keys`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to load API keys (${res.status})`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createKey() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create key");
      setFreshKey(json.key);
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: number) {
    if (!window.confirm("Revoke this API key? Any tool using it will stop working immediately.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/api-keys/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to revoke key");
      if (freshKey && data?.keys.find((k) => k.id === id)) setFreshKey(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke key");
    }
  }

  function copyKey() {
    if (!freshKey) return;
    navigator.clipboard.writeText(freshKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const activeKeys = data?.keys.filter((k) => !k.revoked_at) ?? [];
  const revokedKeys = data?.keys.filter((k) => k.revoked_at) ?? [];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111827] p-5 shadow-sm/5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-emerald-600" /> Public API Keys
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Build bots, dashboards, and CI checks on C-Rank™ data. Send{" "}
            <code className="rounded bg-[#1e293b] px-1 py-0.5 text-[11px]">Authorization: Bearer &lt;key&gt;</code> to{" "}
            <Link href="/docs" className="text-emerald-400 font-semibold hover:underline">
              /docs endpoints
            </Link>
            . Free tier: 60 req/hour + 10/min burst · Pro: 600 req/hour + 100/min burst.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#1e293b] px-2 py-0.5 text-[11px] font-semibold text-zinc-400">
          {data?.is_pro
            ? `Pro · ${data?.limits.pro_hourly_requests ?? 600}/hour`
            : `Free · ${data?.limits.free_hourly_requests ?? 60}/hour`}
        </span>
      </div>

      {/* One-time key reveal */}
      {freshKey && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-950/70 border-emerald-800/80 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Copy your key now - it will never be shown again.
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-[#111827] border border-emerald-200 px-2 py-1.5 text-xs text-zinc-200">
              {freshKey}
            </code>
            <button
              onClick={copyKey}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 cursor-pointer"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-4 text-sm text-zinc-400 animate-pulse">Loading keys…</div>
      ) : (
        <>
          {activeKeys.length > 0 && (
            <ul className="space-y-2 mb-3">
              {activeKeys.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-200 truncate">{k.name}</div>
                    <div className="text-[11px] text-zinc-400">
                      <code>{k.key_prefix}…</code> · created {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at && <> · last used {new Date(k.last_used_at).toLocaleDateString()}</>}
                    </div>
                  </div>
                  <button
                    onClick={() => revoke(k.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
          {revokedKeys.length > 0 && (
            <p className="mb-3 text-[11px] text-zinc-400">
              {revokedKeys.length} revoked key{revokedKeys.length > 1 ? "s" : ""} hidden.
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Key name (e.g. "ci-bot")`}
              maxLength={64}
              disabled={activeKeys.length >= 5}
              className="flex-1 rounded-lg border border-white/[0.12] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50"
            />
            <button
              onClick={createKey}
              disabled={creating || activeKeys.length >= 5}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e293b] px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              {activeKeys.length >= 5 ? "Key limit reached (5)" : "Generate key"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
