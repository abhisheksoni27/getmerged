"use client";

import { ArrowLeft, AlertCircle, Activity, Bookmark, Lock, GitPullRequest } from "lucide-react";
import Link from "next/link";

export function GithubNotFoundView({ fullName }: { fullName: string }) {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12 flex-1 w-full font-sans">
      <Link prefetch={false}
        href="/"
        title="Return to GetMerged Explorer Home"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-300 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Explorer
      </Link>

      <div className="rounded-2xl border border-rose-200 bg-rose-950/70 border-rose-800/80/40 p-8 sm:p-10 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-950/40 border border-rose-500/20 border border-rose-200 text-rose-600 mb-5">
          <AlertCircle className="h-7 w-7" />
        </div>

        <span className="inline-block rounded-full bg-rose-950/40 border border-rose-500/20 px-3 py-1 font-mono text-xs font-bold text-rose-300 mb-3">
          Repository Not Found
        </span>

        <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white mb-3">
          {fullName}
        </h1>

        <p className="text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed mb-8">
          This repository does not exist on GitHub or is private. Please verify the owner and repository name.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link prefetch={false}
            href="/"
            title="Return to GetMerged Explorer Home"
            className="inline-flex items-center gap-2 rounded-full glass-card px-6 py-3 text-xs font-mono font-bold text-white hover:bg-zinc-800 transition-all shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explorer
          </Link>
        </div>
      </div>
    </main>
  );
}

interface IndexingViewProps {
  fullName: string;
  isLoggedIn: boolean;
  isWatching: boolean;
  watchLoading: boolean;
  onWatchToggle: () => void;
  onRequireAuth: (title: string, description: string, source: string) => void;
}

export function IndexingView({
  fullName,
  isLoggedIn,
  isWatching,
  watchLoading,
  onWatchToggle,
  onRequireAuth,
}: IndexingViewProps) {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12 flex-1 w-full font-sans">
      <Link prefetch={false}
        href="/"
        title="Return to GetMerged Explorer Home"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-300 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Explorer
      </Link>

      <div className="rounded-2xl border border-white/[0.1] glass-panel p-8 sm:p-10 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-amber-600 mb-5">
          <Activity className="h-7 w-7" />
        </div>

        <span className="inline-block rounded-full bg-amber-950/80 border-amber-800/80 px-3 py-1 font-mono text-xs font-bold text-amber-300 mb-3">
          Indexing in Progress
        </span>

        <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white mb-3">
          {fullName}
        </h1>

        <p className="text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed mb-8">
          This repository is currently in our indexing queue. We will calculate maintainer response speeds and PR merge rates in our next processing run.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isLoggedIn ? (
            <button
              onClick={onWatchToggle}
              disabled={watchLoading}
              className="inline-flex items-center gap-2 rounded-full glass-card px-6 py-3 text-xs font-mono font-bold text-white hover:bg-zinc-800 transition-all shadow-xs"
            >
              <Bookmark className="h-4 w-4 text-amber-400" />
              {isWatching ? "Watching Repo" : "Watch Repo for Updates"}
            </button>
          ) : (
            <button
              onClick={() => onRequireAuth(
                "Get Notification Updates",
                `Sign in to get notified as soon as ${fullName} indexing completes and statistics are ready.`,
                "indexing_watch"
              )}
              title="Sign in to get notification updates"
              className="inline-flex items-center gap-2 rounded-full glass-card px-6 py-3 text-xs font-mono font-bold text-white hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
            >
              <Lock className="h-4 w-4 text-amber-400" />
              Sign in to Get Notified
            </button>
          )}

          <a
            href={`https://github.com/${fullName}`}
            target="_blank"
            rel="nofollow noopener noreferrer"
            title={`View ${fullName} on GitHub`}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] glass-panel px-6 py-3 text-xs font-mono font-medium text-zinc-300 hover:glass-card transition-all"
          >
            <GitPullRequest className="h-4 w-4" />
            View on GitHub
          </a>
        </div>
      </div>
    </main>
  );
}
