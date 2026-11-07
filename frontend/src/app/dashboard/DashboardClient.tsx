"use client";

import React from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { TopMatches } from "@/components/TopMatches";
import { ForYou } from "@/components/ForYou";
import { FirstMergeTrack } from "@/components/FirstMergeTrack";
import { SeasonCard } from "@/components/SeasonCard";
import { QuestTrackCard } from "@/components/QuestTrackCard";
import { EmbedKarmaBadgeCard } from "@/components/EmbedKarmaBadgeCard";
import { MergeCelebrationModal } from "./MergeCelebrationModal";
import {
  GitPullRequest,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useDashboardData } from "./hooks/useDashboardData";
import { DashboardEmptyState } from "./components/DashboardCard";
import { TrackedPRCard } from "./components/TrackedPRCard";
import { ConnectionBanners } from "./components/ConnectionBanners";
import { MeProfilePanel } from "./components/MeProfilePanel";

export type { TrackedPR } from "./components/types";

export function DashboardClient() {
  const {
    data,
    loading,
    refreshing,
    error,
    unauthorized,
    me,
    sharing,
    updatingVisibility,
    toast,
    load,
    reconnect,
    setProfileVisibility,
    shareProfile,
  } = useDashboardData();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-3 text-sm text-[var(--text-secondary)] font-mono">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
          Loading your pull requests & telemetry…
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="rounded-2xl border border-[var(--border-subtle)] glass-panel p-8 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <GitPullRequest className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold font-sans text-[var(--text-primary)] mb-2">
            Sign In to View Your Contributor Dashboard
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6 font-sans">
            Connect your GitHub account to track open pull requests, view review time forecasts, complete onboarding quests, and earn Karma points.
          </p>
          <a
            href={`${API_BASE_URL}/api/v1/auth/github`}
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-950/40 active:scale-[0.98]"
          >
            <span>Continue with GitHub</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" /> {error}
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            className="px-3 py-1 text-xs font-semibold rounded bg-red-500/20 hover:bg-red-500/30 text-red-200"
          >
            Retry
          </button>
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
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <GitPullRequest className="h-6 w-6 text-emerald-600" /> My PR Tracker
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Your open pull requests to C+ ranked repos, with live review benchmarks.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MeProfilePanel
            me={me}
            sharing={sharing}
            updatingVisibility={updatingVisibility}
            onToggleVisibility={setProfileVisibility}
            onShare={shareProfile}
          />
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg glass-card px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-zinc-800 disabled:opacity-50 cursor-pointer whitespace-nowrap"
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
              ? "bg-emerald-950/70 border-emerald-800/80 border-emerald-300 text-emerald-300"
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

      <ConnectionBanners connection={conn} onReconnect={reconnect} />

      {/* Contributor Progression Quest Track & GitHub README Badge */}
      <div className="mb-8 space-y-6">
        <QuestTrackCard />
        {me?.username && <EmbedKarmaBadgeCard username={me.username} />}
      </div>

      {!data || data.prs.length === 0 ? (
        <DashboardEmptyState>
          No open pull requests to C+ ranked repositories found yet.
          <div className="mt-2">
            <Link prefetch={false} href="/repos" className="text-emerald-400 font-semibold hover:underline">
              Find welcoming repos →
            </Link>
          </div>
        </DashboardEmptyState>
      ) : (
        <ul className="space-y-3">
          {data.prs.map((pr) => (
            <TrackedPRCard key={pr.pr_id} pr={pr} />
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-[11px] text-[var(--text-secondary)]">
        Newest {data?.prs.length ?? 0} tracked PRs · live refresh at most once per 5 minutes · cron poll every 15 minutes ·
        entries older than {data?.stale_after_min ?? 30} min are flagged stale.
      </p>
    </div>
  );
}
