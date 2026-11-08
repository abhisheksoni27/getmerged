"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Zap, Loader2, AlertTriangle, Share2, Clock } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

interface ScanVerdict {
  full_name: string;
  owner: string;
  name: string;
  score: number;
  tier: string;
  language?: string;
  prs_analyzed?: number;
  headline?: string;
  og_image_url?: string;
  share_url?: string;
  verdict_url?: string;
}

interface ScanStatus {
  state: "ready" | "scoring" | "queued" | "error" | "unknown";
  progress?: number;
  message?: string;
  full_name?: string;
  verdict?: ScanVerdict | null;
}

interface InstantScanPanelProps {
  fullName: string;
}

// Client-side poll budget: ~30s target, hard stop at 120s -> retry UI (AC6).
const POLL_INTERVAL_MS = 2500;
const HARD_TIMEOUT_MS = 120_000;

function safeSetLocal(key: string, value: string) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Private mode / quota exceeded - scanning must never break on storage.
  }
}

export function InstantScanPanel({ fullName }: InstantScanPanelProps) {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  const poll = useCallback(
    async (startedAt: number) => {
      while (!cancelled.current) {
        if (Date.now() - startedAt > HARD_TIMEOUT_MS) {
          setTimedOut(true);
          setBusy(false);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled.current) return;
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/v1/scan/status/${encodeURIComponent(fullName.split("/")[0] || "")}/${encodeURIComponent(fullName.split("/")[1] || "")}`,
            { headers: { Accept: "application/json" } }
          );
          if (!res.ok) throw new Error(`status ${res.status}`);
          const data: ScanStatus = await res.json();
          if (cancelled.current) return;
          setStatus(data);
          if (data?.state === "ready" && data.verdict) {
            setBusy(false);
            safeSetLocal(`gm:scan:${fullName}`, data.verdict.tier || "");
            // Reload so the freshly scored verdict page renders in full.
            if (typeof window !== "undefined") {
              window.setTimeout(() => window.location.reload(), 900);
            }
            return;
          }
          if (data?.state === "error") {
            setError(data.message || "Scoring failed. Please retry.");
            setBusy(false);
            return;
          }
          if (data?.state === "queued") {
            setBusy(false);
            return;
          }
        } catch {
          // Transient poll failure: keep polling until the hard timeout.
        }
      }
    },
    [fullName]
  );

  const startScan = useCallback(async () => {
    setError(null);
    setTimedOut(false);
    setBusy(true);
    setStatus({ state: "scoring", progress: 5, message: "Starting scan…" });
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url: `https://github.com/${fullName}` }),
      });
      const data: ScanStatus & { error?: string } = await res
        .json()
        .catch(() => ({ state: "error" as const }));
      if (!res.ok) {
        setError(data?.error || "Could not start the scan. Please retry.");
        setBusy(false);
        return;
      }
      setStatus(data);
      if (data?.state === "ready" && data.verdict) {
        setBusy(false);
        if (typeof window !== "undefined") window.location.reload();
        return;
      }
      if (data?.state === "queued") {
        setBusy(false);
        return;
      }
      void poll(Date.now());
    } catch {
      setError("Network error while starting the scan. Please retry.");
      setBusy(false);
    }
  }, [fullName, poll]);

  const verdict = status?.state === "ready" ? status.verdict : null;
  const shareURL =
    verdict?.share_url ||
    `https://getmerged.abhishekco.de/${fullName}?utm_source=share&utm_medium=verdict_card&utm_campaign=instant_repo_check`;

  const handleShare = useCallback(async () => {
    const text = verdict?.headline
      ? `${verdict.headline} - ${shareURL}`
      : `C-Rank verdict for ${fullName} - ${shareURL}`;
    try {
      const nav = typeof navigator !== "undefined" ? navigator : undefined;
      if (nav && typeof nav.share === "function") {
        await nav.share({ title: `C-Rank: ${fullName}`, text, url: shareURL });
        return;
      }
    } catch {
      // User dismissed the share sheet or it is unsupported - fall back to copy.
    }
    const ok = await copyToClipboard(text);
    setCopied(ok);
    if (!ok) setError("Could not copy the share link. Copy it from the address bar instead.");
  }, [fullName, shareURL, verdict?.headline]);

  const progress = Math.min(95, Math.max(5, status?.progress ?? 5));

  return (
    <div
      data-testid="instant-scan-panel"
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-xs mb-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-space text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600" />
            Run an instant C-Rank check on {fullName}
          </h3>
          <p className="text-xs font-sans text-[var(--text-secondary)] mt-1 leading-relaxed max-w-2xl">
            We score this repo live from GitHub&apos;s public pull-request history - usually in under
            30 seconds. Results are cached for 24 hours and refreshed when new commits land.
          </p>
        </div>
        {!verdict && (
          <button
            type="button"
            onClick={startScan}
            disabled={busy}
            data-testid="instant-scan-start"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-900 bg-zinc-900 px-4 py-2 text-xs font-mono font-bold text-white shadow-xs transition-all hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed shrink-0 cursor-pointer"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            {busy ? "Scoring…" : "Scan this repo now"}
          </button>
        )}
      </div>

      {busy && !timedOut && (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="h-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] font-mono text-[var(--text-secondary)] mt-1.5">
            {status?.message || "Fetching pull-request history…"} ({progress}%)
          </p>
        </div>
      )}

      {status?.state === "queued" && (
        <div className="mt-4 flex items-start gap-2 text-xs font-mono text-[var(--text-secondary)]" role="status">
          <Clock className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            {status.message ||
              "Scoring queued - GitHub API quota is saturated. This repo will be scored automatically."}
          </span>
        </div>
      )}

      {(timedOut || error) && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-mono text-rose-700">
          <span className="inline-flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error || "Scoring is taking longer than expected. No partial result is shown."}
          </span>
          <button
            type="button"
            onClick={startScan}
            data-testid="instant-scan-retry"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] px-3 py-1 font-bold text-[var(--text-primary)] shadow-xs w-fit cursor-pointer"
          >
            Retry scan
          </button>
        </div>
      )}

      {verdict && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs font-mono font-bold text-[var(--text-primary)]">
            {verdict.headline || `${verdict.tier}-tier · C-Rank ${Math.round(verdict.score)}/100`}
          </p>
          <button
            type="button"
            onClick={handleShare}
            data-testid="instant-scan-share"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-mono font-bold text-[var(--text-primary)] shadow-xs w-fit cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            {copied ? "Link copied" : "Share verdict"}
          </button>
        </div>
      )}
    </div>
  );
}
