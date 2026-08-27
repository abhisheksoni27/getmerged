"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { LangLogo } from "@/components/LangLogo";
import {
  Bookmark,
  BookmarkX,
  Star,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  ShieldCheck,
  Flame,
  ArrowRight,
  Compass,
  Webhook,
  AlertTriangle,
  Trash2,
  Bell,
  BellOff,
} from "lucide-react";
import posthog from "posthog-js";

export interface SnapshotHistoryItem {
  snapshot_date: string;
  c_rank_score: number;
  c_rank_tier: string;
}

export interface WatchedRepoItem {
  repo: Repo;
  history: SnapshotHistoryItem[];
}

const TIER_RANKS: Record<string, number> = {
  S: 5,
  A: 4,
  B: 3,
  C: 2,
  D: 1,
};

function getBadgeStyle(rank?: string) {
  switch (rank) {
    case "S":
      return {
        badgeClass: "bg-[#8ce99a] text-black border-2 border-black font-bold shadow-[2px_2px_0px_#000]",
        label: "Super Welcoming",
        indicatorColor: "bg-emerald-600",
      };
    case "A":
      return {
        badgeClass: "bg-[#bfdbff] text-black border-2 border-black font-bold shadow-[2px_2px_0px_#000]",
        label: "Welcoming",
        indicatorColor: "bg-blue-600",
      };
    case "B":
      return {
        badgeClass: "bg-[#ffd93d] text-black border-2 border-black font-bold shadow-[2px_2px_0px_#000]",
        label: "Moderate",
        indicatorColor: "bg-amber-600",
      };
    case "C":
      return {
        badgeClass: "bg-[#e5dbff] text-black border-2 border-black font-bold shadow-[2px_2px_0px_#000]",
        label: "Slow Review",
        indicatorColor: "bg-purple-600",
      };
    case "D":
      return {
        badgeClass: "bg-[#ffb3c7] text-black border-2 border-black font-bold shadow-[2px_2px_0px_#000]",
        label: "Unmaintained",
        indicatorColor: "bg-rose-600",
      };
    default:
      return {
        badgeClass: "bg-[#0f172a] text-black border-2 border-black font-bold shadow-[2px_2px_0px_#000]",
        label: "Scored",
        indicatorColor: "bg-zinc-600",
      };
  }
}

interface TierDeltaProps {
  repo: Repo;
  history: SnapshotHistoryItem[];
}

function TierDeltaIndicatorChip({ repo, history }: TierDeltaProps) {
  const currentTier = repo.c_rank_tier || repo.class_rank || "A";
  const repoSlug = (repo.full_name || `${repo.owner}/${repo.name}`).replace("/", "-");

  // Determine previous tier from history if available
  let prevTier: string | null = null;
  if (history && history.length >= 2) {
    prevTier = history[history.length - 2]?.c_rank_tier || null;
  } else if (history && history.length === 1) {
    prevTier = history[0]?.c_rank_tier || null;
  }

  const currentRank = TIER_RANKS[currentTier] ?? 3;
  const prevRank = prevTier ? (TIER_RANKS[prevTier] ?? currentRank) : currentRank;

  if (prevTier && currentRank > prevRank) {
    // Upward mobility
    return (
      <span
        data-testid={`tier-delta-chip-${repoSlug}`}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/90 font-mono text-xs font-semibold"
        title={`Tier improved from ${prevTier} to ${currentTier}`}
      >
        <TrendingUp className="h-3.5 w-3.5 text-emerald-700" />
        <span>Tier {prevTier} → {currentTier} (Improved)</span>
        <span className="sr-only">Tier improved from {prevTier} to {currentTier}</span>
      </span>
    );
  }

  if (prevTier && currentRank < prevRank) {
    // Downward shift
    return (
      <span
        data-testid={`tier-delta-chip-${repoSlug}`}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200/90 font-mono text-xs font-semibold"
        title={`Tier shifted down from ${prevTier} to ${currentTier}`}
      >
        <TrendingDown className="h-3.5 w-3.5 text-red-700" />
        <span>Tier {prevTier} → {currentTier} (Shifted)</span>
        <span className="sr-only">Tier shifted from {prevTier} to {currentTier}</span>
      </span>
    );
  }

  // Neutral / stable state
  return (
    <span
      data-testid={`tier-delta-chip-${repoSlug}`}
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200/90 font-mono text-xs font-medium"
      title={`Tier ${currentTier} stable (no recent changes)`}
    >
      <Minus className="h-3 w-3 text-zinc-500" />
      <span>Tier {currentTier} · Stable</span>
      <span className="sr-only">Tier unchanged ({currentTier})</span>
    </span>
  );
}

interface WatchedCardProps {
  item: WatchedRepoItem;
  onUnwatch: (repoId: string, fullName: string) => Promise<void>;
  alertsEnabled: boolean;
  onToggleAlerts: (repoId: string, enabled: boolean) => Promise<boolean>;
}

function WatchedRepoCard({ item, onUnwatch, alertsEnabled, onToggleAlerts }: WatchedCardProps) {
  const router = useRouter();
  const { repo, history } = item;
  const rank = repo.class_rank || repo.c_rank_tier || "A";
  const [ownerPart, namePart] = repo.full_name ? repo.full_name.split("/") : [repo.owner || "", repo.name || ""];
  const [isRemoving, setIsRemoving] = useState(false);
  const [alertsOn, setAlertsOn] = useState(alertsEnabled);

  useEffect(() => {
    setAlertsOn(alertsEnabled);
  }, [alertsEnabled]);

  const badgeStyle = getBadgeStyle(rank);

  const mergeRate =
    repo.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate > 0
      ? `${Math.round(repo.external_pr_merge_rate)}%`
      : "-";

  const firstResponseHours = repo.time_to_first_response_hours;
  const firstResponse =
    firstResponseHours && firstResponseHours > 0
      ? firstResponseHours < 1
        ? "<1h"
        : firstResponseHours < 24
        ? `${Math.round(firstResponseHours)}h`
        : `${Math.round(firstResponseHours / 24)}d`
      : "-";

  const firstTimerRate =
    repo.first_timer_success_rate !== undefined && repo.first_timer_success_rate >= 0
      ? `${Math.round(repo.first_timer_success_rate)}%`
      : "-";

  const gfiCount = repo.good_first_issue_count ?? 0;
  const gfiLabel = gfiCount === 1 ? "1 good first issue" : `${gfiCount} good first issues`;

  const handleUnwatchClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRemoving(true);
    try {
      await onUnwatch(String(repo.id || repo.full_name), repo.full_name);
    } catch {
      setIsRemoving(false);
    }
  };

  const handleToggleAlertsClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !alertsOn;
    setAlertsOn(next);
    const ok = await onToggleAlerts(String(repo.id || repo.full_name), next);
    if (!ok) setAlertsOn(!next);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    posthog.capture("compare_cta_clicked", {
      repo_full_name: repo.full_name,
      source: "watchlist_card",
    });
    router.push(`/compare?a=${encodeURIComponent(repo.full_name)}`);
  };

  const scoreDisplay =
    repo.c_rank_score !== undefined && repo.c_rank_score > 0
      ? repo.c_rank_score.toFixed(1)
      : "0.0";

  return (
    <div
      className={`group p-5 rounded-2xl border border-zinc-200/80 bg-white hover:border-emerald-500/80 hover:shadow-xs transition-all flex flex-col justify-between gap-4 ${
        isRemoving ? "opacity-40 pointer-events-none scale-[0.98]" : ""
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-xl border border-zinc-200/80 bg-zinc-50 overflow-hidden shrink-0 shadow-2xs group-hover:border-zinc-300 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://github.com/${ownerPart}.png?size=64`}
                alt={ownerPart}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png?size=64";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/${ownerPart}/${namePart}`}
                title={`View ${repo.full_name} scorecard`}
                className="font-space text-base font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1 min-w-0 no-underline"
              >
                <h3 className="truncate text-base font-bold">{repo.full_name}</h3>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 shrink-0" />
              </Link>
              <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-zinc-500">
                <span className="flex items-center gap-1 font-semibold text-zinc-700">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                  {repo.stars >= 1_000 ? `${(repo.stars / 1_000).toFixed(1)}k` : repo.stars}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 truncate text-zinc-600">
                  <LangLogo language={repo.language} />
                  <span className="truncate">{repo.language || "Code"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action & Badge Group */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleAlertsClick}
              aria-label={alertsOn ? `Disable C-Rank alerts for ${repo.full_name}` : `Enable C-Rank alerts for ${repo.full_name}`}
              title={alertsOn ? "Email alerts on - click to mute" : "Email alerts off - click to enable"}
              data-testid={`alerts-toggle-${ownerPart}-${namePart}`}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                alertsOn
                  ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  : "border-zinc-200 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {alertsOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleUnwatchClick}
              aria-label={`Unwatch ${repo.full_name}`}
              title={`Remove ${repo.full_name} from watchlist`}
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <BookmarkX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tier & Score Row with Delta Chip */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* C-Rank Tier Pill */}
          <div
            className={`px-2.5 py-0.5 rounded-xl text-xs font-bold font-mono border shrink-0 flex items-center gap-1.5 ${badgeStyle.badgeClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badgeStyle.indicatorColor}`} />
            <span>Tier {rank}</span>
            <span className="text-zinc-400 font-normal">|</span>
            <span className="text-zinc-900 font-extrabold">{scoreDisplay}</span>
          </div>

          {/* Delta Indicator Chip */}
          <TierDeltaIndicatorChip repo={repo} history={history} />
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed font-sans font-normal mb-4 min-h-[2.5rem]">
          {repo.description || "No repository description available."}
        </p>

        {/* Telemetry Metrics Scorecard */}
        <div className="grid grid-cols-3 gap-3 py-3 px-3.5 bg-zinc-50/80 rounded-xl border border-zinc-100/90 my-auto text-center font-mono">
          <div className="pr-1">
            <div className="text-xs font-bold text-zinc-900">{mergeRate}</div>
            <div className="text-[10px] text-zinc-500 font-medium whitespace-nowrap mt-0.5">Merge Rate</div>
          </div>
          <div className="border-x border-zinc-200/70 px-1">
            <div className="text-xs font-bold text-zinc-900">{firstResponse}</div>
            <div className="text-[10px] text-zinc-500 font-medium whitespace-nowrap mt-0.5">First Review</div>
          </div>
          <div className="pl-1">
            <div className="text-xs font-bold text-zinc-900">{firstTimerRate}</div>
            <div className="text-[10px] text-zinc-500 font-medium whitespace-nowrap mt-0.5">1st-Timers</div>
          </div>
        </div>
      </div>

      {/* Footer Row */}
      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-mono text-zinc-500">
        <div className="flex items-center gap-2">
          {gfiCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-medium text-[10px]">
              <ShieldCheck className="h-3 w-3" />
              {gfiLabel}
            </span>
          ) : repo.is_trending ? (
            <span className="inline-flex items-center gap-0.5 text-orange-700 font-medium text-[10px]">
              <Flame className="h-3 w-3 fill-orange-500" />
              Trending
            </span>
          ) : (
            <span className="text-[11px]">
              {repo.snapshot_date ? `Snapshot ${repo.snapshot_date}` : "Telemetry active"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="compare-cta"
            title={`Compare ${repo.full_name} with another repository`}
            aria-label={`Compare ${repo.full_name}`}
            onClick={handleCompareClick}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-emerald-700 bg-zinc-100/70 hover:bg-emerald-50 px-2 py-1 rounded-md border border-zinc-200/60 transition-colors cursor-pointer"
          >
            <Scale className="h-3 w-3" />
            <span>Compare</span>
          </button>
          <Link
            href={`/${ownerPart}/${namePart}`}
            title={`View ${repo.full_name} details and C-Rank breakdown`}
            className="font-semibold text-zinc-900 hover:text-emerald-700 transition-colors flex items-center gap-0.5 no-underline"
          >
            View details →
          </Link>
        </div>
      </div>
    </div>
  );
}

function WatchlistEmptyState() {
  return (
    <div className="p-10 text-center bg-white rounded-3xl border border-zinc-200/80 shadow-2xs my-8 max-w-xl mx-auto flex flex-col items-center animate-fade-in">
      <div className="h-14 w-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4 text-zinc-400">
        <Bookmark className="h-8 w-8" />
      </div>
      <h2 className="font-space text-xl font-bold text-zinc-900 mb-2">Your Watchlist is Empty</h2>
      <p className="text-sm text-zinc-600 font-sans mb-6 max-w-sm leading-relaxed">
        Save repositories to track live C-Rank™ tier shifts, maintainer response velocity, and telemetry changes in one place.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Link
          href="/repos"
          title="Browse all indexed open source repositories"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white font-sans text-sm font-semibold hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-xs no-underline"
        >
          <Compass className="h-4 w-4" />
          <span>Browse Repositories</span>
        </Link>
        <Link
          href="/good-first-issue"
          title="Explore beginner friendly good first issues"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-zinc-700 hover:text-zinc-900 font-sans text-sm font-medium hover:bg-zinc-50 transition-colors no-underline"
        >
          <span>Explore Good First Issues</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

interface WatchlistClientProps {
  initialItems: WatchedRepoItem[];
}

export interface WatchlistWebhook {
  id: number;
  label: string;
  url: string;
  enabled: boolean;
}

function WebhookChannels() {
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
    <div className="mb-8 p-5 rounded-2xl border border-zinc-200/80 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <Webhook className="h-4 w-4 text-emerald-700" />
        <h2 className="font-space text-base font-bold text-zinc-900">Webhook Alerts</h2>
        <span className="text-xs text-zinc-500 font-sans">Slack &amp; Discord pings when a watched repo crosses a tier or jumps 10+ C-Rank points</span>
      </div>

      {webhooks.length > 0 && (
        <ul className="flex flex-col gap-2 mb-4">
          {webhooks.map((wh) => (
            <li key={wh.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-zinc-200/80 bg-zinc-50/60">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-white text-[10px] font-mono font-bold uppercase shrink-0">{wh.label}</span>
                <span className="font-mono text-xs text-zinc-700 truncate">{wh.url}</span>
                {!wh.enabled && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200/90 font-mono text-[10px] font-semibold shrink-0"
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
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
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
          className="px-3 py-2 rounded-xl border border-zinc-200/90 bg-white text-sm font-sans text-zinc-800 focus:outline-none focus:border-emerald-500"
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
          className="flex-1 px-3 py-2 rounded-xl border border-zinc-200/90 bg-white text-sm font-sans text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={busy || webhooks.length >= 5}
          title={webhooks.length >= 5 ? "Webhook limit reached (max 5)" : "Add webhook"}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-sans font-semibold hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-xs disabled:opacity-40 disabled:pointer-events-none"
        >
          {busy ? "Adding…" : "Add Webhook"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600 font-sans">{error}</p>}
    </div>
  );
}

export function WatchlistClient({ initialItems }: WatchlistClientProps) {
  const [items, setItems] = useState<WatchedRepoItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Sync per-repo alert toggle state (AC3); defaults to on when absent.
    fetch(`${API_BASE_URL}/api/v1/user/watchlist`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.alerts && typeof data.alerts === "object" && !Array.isArray(data.alerts)) {
          setAlerts(data.alerts as Record<string, boolean>);
        }
      })
      .catch(() => {});
  }, [items.length]);

  useEffect(() => {
    // If initial items was empty or needs client refresh, sync with API
    if (initialItems.length === 0) {
      setLoading(true);
      fetch(`${API_BASE_URL}/api/v1/user/watchlist`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : { watchlist: [] }))
        .then(async (data) => {
          const ids: string[] = data.watchlist || [];
          if (ids.length === 0) {
            setItems([]);
            return;
          }
          const loaded = await Promise.all(
            ids.map(async (id) => {
              try {
                const [rRes, hRes] = await Promise.all([
                  fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(id)}`),
                  fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(id)}/history`),
                ]);
                const repo = rRes.ok ? await rRes.json() : null;
                const historyData = hRes.ok ? await hRes.json() : null;
                if (!repo) return null;
                return {
                  repo,
                  history: historyData?.history || [],
                };
              } catch {
                return null;
              }
            })
          );
          setItems(loaded.filter(Boolean) as WatchedRepoItem[]);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [initialItems.length]);

  const handleUnwatch = async (repoId: string, fullName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/watchlist/${encodeURIComponent(repoId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => String(item.repo.id) !== String(repoId) && item.repo.full_name !== fullName));
        posthog.capture("repo_unwatched", { repo_id: repoId, full_name: fullName });
      }
    } catch (e) {
      console.error("Failed to unwatch repo", e);
    }
  };

  const handleToggleAlerts = async (repoId: string, enabled: boolean): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/watchlist/${encodeURIComponent(repoId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notify_rank_change: enabled }),
      });
      if (!res.ok) return false;
      setAlerts((prev) => ({ ...prev, [repoId]: enabled }));
      posthog.capture("watchlist_alerts_toggled", { repo_id: repoId, enabled });
      return true;
    } catch (e) {
      console.error("Failed to toggle watchlist alerts", e);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Watchlist Hero Header */}
        <div className="mb-8 border-b border-zinc-200/80 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-space text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
                My Watchlist
              </h1>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Bookmark className="h-3 w-3" />
                <span>{items.length} saved</span>
              </span>
            </div>
            <p className="text-sm text-zinc-600 font-sans mt-2 max-w-2xl">
              Track live C-Rank™ tier shifts, maintainer response velocity, and telemetry changes for your saved open-source repositories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/repos"
              title="Explore all indexed open source repositories"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-200/90 text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300 font-sans text-xs font-semibold shadow-2xs transition-all no-underline"
            >
              <Compass className="h-3.5 w-3.5 text-zinc-500" />
              <span>Explore More Repos</span>
            </Link>
          </div>
        </div>

        {/* Slack/Discord webhook alert channels */}
        <WebhookChannels />

        {/* Loading Spinner */}
        {loading && items.length === 0 ? (
          <div className="py-20 flex justify-center items-center">
            <div className="h-8 w-8 rounded-full border-2 border-zinc-900 border-t-transparent animate-spin" />
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {items.map((item) => (
              <WatchedRepoCard
                key={item.repo.id || item.repo.full_name}
                item={item}
                onUnwatch={handleUnwatch}
                alertsEnabled={alerts[String(item.repo.id)] !== false}
                onToggleAlerts={handleToggleAlerts}
              />
            ))}
          </div>
        ) : (
          <WatchlistEmptyState />
        )}
      </div>
    </div>
  );
}
