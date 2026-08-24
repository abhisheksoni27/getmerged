"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { TopMatches } from "@/components/TopMatches";
import { ForYou } from "@/components/ForYou";
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
}

interface Connection {
  status: "active" | "reconnect_required";
  github_login: string;
  last_synced_at: string | null;
  limited: boolean;
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
      <div className="mb-6">
        <ForYou />
        <TopMatches />
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
