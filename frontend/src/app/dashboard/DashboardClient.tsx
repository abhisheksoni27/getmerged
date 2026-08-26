"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { formatVerdict, formatAccuracy, type PREvalOutcome } from "@/lib/pr-verdict";
import { TopMatches } from "@/components/TopMatches";
import { ForYou } from "@/components/ForYou";
import { FirstMergeTrack } from "@/components/FirstMergeTrack";
import { SeasonCard } from "@/components/SeasonCard";
import { ApiKeysCard } from "./ApiKeysCard";
import { MergeCelebrationModal } from "./MergeCelebrationModal";
import {
  GitPullRequest,
  Clock,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  Lock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  MessageSquareWarning,
  Merge,
  CircleDashed,
  Share2,
} from "lucide-react";

interface Benchmark {
  response_p50_hours: number | null;
  response_p90_hours: number | null;
  median_time_to_merge_hours: number | null;
}

interface Forecast {
  label: string;
  score: number;
  reasons: string[];
  basis: string;
}

export interface TrackedPR {
  pr_id: string;
  repository_id: string;
  full_name: string;
  c_rank_tier: string;
  pr_number: number;
  title: string;
  html_url: string;
  state: "open" | "changes_requested" | "approved" | "merged" | "closed";
  pr_created_at: string | null;
  github_updated_at: string | null;
  fetched_at: string;
  age_hours: number;
  stale: boolean;
  benchmark: Benchmark | null;
  forecast?: Forecast | null;
  forecast_locked: boolean;
  outcome?: PREvalOutcome | null;
}

interface Connection {
  status: "active" | "reconnect_required";
  github_login: string;
  last_synced_at: string | null;
  limited: boolean;
}

interface MeInfo {
  slug?: string | null;
  username?: string;
  is_public?: boolean;
}

// Clipboard write with graceful fallback (AC2): async Clipboard API first,
// hidden-textarea execCommand fallback, throws only when both fail so the
// caller can surface a visible error toast instead of an unhandled rejection.
async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // fall through to execCommand fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) throw new Error("execCommand copy failed");
  } catch {
    throw new Error("Could not access the clipboard");
  }
}

interface DashboardData {
  prs: TrackedPR[];
  generated_at: string;
  stale_after_min: number;
  connection: Connection;
  is_pro: boolean;
}

function fmtHours(h: number | null | undefined): string {
  if (h === null || h === undefined) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

const STATE_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  open: { label: "Open", icon: <CircleDashed className="h-3.5 w-3.5" />, cls: "bg-zinc-100 text-zinc-700 border border-zinc-300" },
  changes_requested: { label: "Changes requested", icon: <MessageSquareWarning className="h-3.5 w-3.5" />, cls: "bg-amber-100 text-amber-800 border border-amber-300" },
  approved: { label: "Approved", icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: "bg-emerald-100 text-emerald-800 border border-emerald-300" },
  merged: { label: "Merged", icon: <Merge className="h-3.5 w-3.5" />, cls: "bg-violet-100 text-violet-800 border border-violet-300" },
  closed: { label: "Closed", icon: <XCircle className="h-3.5 w-3.5" />, cls: "bg-red-100 text-red-700 border border-red-300" },
};

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeInfo | null>(null);
  const [sharing, setSharing] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

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

  // AC2: Share profile flow — prompt to go public first when needed, then
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

  async function shareProfile() {
    if (sharing) return;
    const slug = me?.slug || (me?.username ? me.username.toLowerCase() : "");
    if (!slug) {
      setToast({ kind: "error", msg: "Profile unavailable — try reloading the page." });
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
        setToast({ kind: "error", msg: `Copy failed — your link: ${url}` });
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
      if (!res.ok) throw new Error(`Failed to load PR tracker (${res.status})`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PR tracker");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true); // initial page-load refresh; server enforces the 5-min/user throttle
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-sm text-zinc-500 animate-pulse">
        Loading your pull requests…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      </div>
    );
  }

  const conn = data?.connection;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      {/* One-time merge-moment celebration for verified preflight predictions */}
      <MergeCelebrationModal prs={data?.prs ?? []} />
      <FirstMergeTrack trackedPRs={data?.prs} />
      <SeasonCard />
      <div className="mb-6">
        <ForYou />
        <TopMatches />
      </div>
      <div className="mb-6">
        <ApiKeysCard />
      </div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <GitPullRequest className="h-6 w-6 text-emerald-600" /> My PR Tracker
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Your open pull requests to C+ ranked repos, with live review benchmarks.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {me?.slug && (
            <>
              {/* AC1: profile is private by default; explicit opt-in toggle */}
              <label
                className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-700 cursor-pointer select-none"
                title="Anyone with your /u link can see your track record"
              >
                <input
                  type="checkbox"
                  data-testid="public-profile-toggle"
                  checked={!!me.is_public}
                  disabled={updatingVisibility}
                  onChange={(e) => setProfileVisibility(e.target.checked)}
                  className="h-3.5 w-3.5 accent-emerald-600 cursor-pointer disabled:opacity-50"
                />
                Public
              </label>
              <button
                onClick={shareProfile}
                disabled={sharing}
                data-testid="share-profile"
                title={me?.is_public ? "Copy your public profile link" : "Make your profile public and copy the link"}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <Share2 className={`h-3.5 w-3.5 ${sharing ? "animate-pulse" : ""}`} />
                Share profile
              </button>
            </>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            title="Live refresh is rate-limited to once every 5 minutes per user"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* AC2: share-flow feedback (success/error) as a visible toast */}
      {toast && (
        <div
          data-testid="share-toast"
          role="status"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-lg ${
            toast.kind === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-red-50 border-red-300 text-red-700"
          }`}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      {/* AC6: reconnect banner */}
      {conn?.status === "reconnect_required" && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-900">
            <WifiOff className="h-4 w-4 shrink-0" />
            GitHub connection expired — background syncing paused.
          </div>
          <button
            onClick={reconnect}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer whitespace-nowrap"
          >
            Reconnect GitHub
          </button>
        </div>
      )}

      {/* AC5: limited badge when serving cached data due to rate limiting */}
      {conn?.limited && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          GitHub API rate limit hit — showing cached data. Live sync resumes automatically.
        </div>
      )}

      {!data || data.prs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">
          No open pull requests to C+ ranked repositories found yet.
          <div className="mt-2">
            <Link href="/repos" className="text-emerald-700 font-semibold hover:underline">
              Find welcoming repos →
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.prs.map((pr) => {
            const meta = STATE_META[pr.state] ?? STATE_META.open;
            // Verified verdict (AC1/AC3): same field set as share pages/OG.
            const verdictView = formatVerdict(pr.outcome ?? null);
            const accuracyView = formatAccuracy(pr.outcome ?? null);
            const verdictCls =
              verdictView?.tone === "good"
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : verdictView?.tone === "bad"
                  ? "bg-red-100 text-red-700 border border-red-300"
                  : "bg-zinc-100 text-zinc-600 border border-zinc-300";
            return (
              <li key={pr.pr_id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-[2px_2px_0px_#000]/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                        {meta.icon} {meta.label}
                      </span>
                      {pr.stale && (
                        <span data-testid="stale-badge" className="rounded-full bg-orange-100 text-orange-700 border border-orange-300 px-2 py-0.5 text-[11px] font-semibold">
                          stale
                        </span>
                      )}
                      <span className="rounded-full bg-zinc-900 text-white px-1.5 py-0.5 text-[10px] font-bold">{pr.c_rank_tier}</span>
                    </div>
                    <a
                      href={pr.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-semibold text-sm text-zinc-900 hover:text-emerald-700"
                    >
                      {pr.title} <ExternalLink className="inline h-3 w-3 text-zinc-400" />
                    </a>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {pr.full_name}#{pr.pr_number}
                    </div>
                  </div>
                  <div className="text-right text-xs text-zinc-500 shrink-0 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> open {fmtHours(pr.age_hours)}
                  </div>
                </div>

                {/* AC3: benchmark line from /api/v1/pr-likelihood medians */}
                <div className="mt-3 rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2 text-xs text-zinc-600">
                  <span className="font-semibold text-zinc-700">Repo review pace:</span>{" "}
                  p50 {fmtHours(pr.benchmark?.response_p50_hours)} · p90 {fmtHours(pr.benchmark?.response_p90_hours)} · merge{" "}
                  {fmtHours(pr.benchmark?.median_time_to_merge_hours)}
                </div>

                {/* AC1: verified outcome synced from the PR tracker */}
                {verdictView && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap" data-testid="pr-verdict">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold font-mono ${verdictCls}`}>
                      {verdictView.text}
                    </span>
                    {accuracyView && (
                      <span className="text-[11px] font-mono text-zinc-500">{accuracyView.label}</span>
                    )}
                  </div>
                )}

                {/* AC4: Pro-gated transparent rule-based forecast */}
                <div className="mt-2">
                  {pr.forecast ? (
                    <div className="text-xs text-zinc-600">
                      <span className="font-semibold">Acceptance outlook:</span>{" "}
                      <span className="font-bold capitalize">{pr.forecast.label}</span> ({pr.forecast.score}/100)
                      <ul className="list-disc ml-5 mt-1 space-y-0.5 text-zinc-500">
                        {pr.forecast.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                      <div className="mt-1 text-zinc-400 italic">{pr.forecast.basis}</div>
                    </div>
                  ) : pr.forecast_locked ? (
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-emerald-700"
                    >
                      <Lock className="h-3 w-3" /> Acceptance forecast — unlock with Pro
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-center text-[11px] text-zinc-400">
        Newest {data?.prs.length ?? 0} tracked PRs · live refresh at most once per 5 minutes · cron poll every 15 minutes ·
        entries older than {data?.stale_after_min ?? 30} min are flagged stale.
      </p>
    </div>
  );
}
