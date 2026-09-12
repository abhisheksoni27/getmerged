"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AuthModal } from "@/components/AuthModal";
import { AlertCircle, Flame, Sparkles, CalendarClock, Trophy } from "lucide-react";
import { LeaderboardRepo } from "./components/hacktoberfestTypes";
import { useHacktoberfestProgress } from "./components/useHacktoberfestProgress";
import { ProgressTracker } from "./components/ProgressTracker";
import { LeaderboardTable } from "./components/LeaderboardTable";

// Re-exported so existing imports from this module keep working.
export type { LeaderboardRepo };

export function HacktoberfestClient({ initialRepos }: { initialRepos: LeaderboardRepo[] }) {
  const [repos] = useState<LeaderboardRepo[]>(initialRepos);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const {
    progress,
    loading,
    isAuthenticated,
    isNudging,
    copiedCard,
    mergedCount,
    target,
    progressPercent,
    phase,
    triggerNudge,
    handleCopyShareLink,
  } = useHacktoberfestProgress();

  const openAuth = () => setIsAuthModalOpen(true);

  // Pre-event: tracker is dormant until Oct 1 — show countdown + leaderboard.
  if (phase === "pre") {
    return (
      <div className="space-y-10">
        <HeroHeader />
        <PreEventBanner />
        <LeaderboardTable repos={repos} />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          title="Connect GitHub to Track Hacktoberfest"
          description="Sign in to track your pull requests, monitor merge speed, and earn verified completion cards."
          source="hacktoberfest"
        />
      </div>
    );
  }

  // Post-event: merges are frozen — show recap + leaderboard.
  if (phase === "post") {
    return (
      <div className="space-y-10">
        <HeroHeader />
        <PostEventBanner mergedCount={mergedCount} cardIssued={progress?.card_issued ?? false} shareUrl={progress?.card?.share_url} />
        <LeaderboardTable repos={repos} />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          title="Connect GitHub to Track Hacktoberfest"
          description="Sign in to track your pull requests, monitor merge speed, and earn verified completion cards."
          source="hacktoberfest"
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <HeroHeader />

      {/* Reconnect / Re-auth Banner (AC6) */}
      {progress?.reconnect_required && (
        <div className="rounded-2xl bg-amber-950/70 border-amber-800/80 border border-amber-300 p-4 sm:p-6 text-amber-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold font-space">GitHub OAuth Token Expired or Revoked</h3>
              <p className="text-xs text-amber-300 mt-0.5">
                Your merge count is frozen with your last known verified total. Re-authenticate with GitHub to resume live syncing.
              </p>
            </div>
          </div>
          <Link
            href="/api/v1/auth/github"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shrink-0 shadow-xs"
          >
            Re-authenticate GitHub
          </Link>
        </div>
      )}

      {/* Live Merge Progress Tracker (AC1-AC6, AC8) */}
      <ProgressTracker
        progress={progress}
        loading={loading}
        isAuthenticated={isAuthenticated}
        isNudging={isNudging}
        copiedCard={copiedCard}
        mergedCount={mergedCount}
        target={target}
        progressPercent={progressPercent}
        onCheckMerges={() => triggerNudge()}
        onSignIn={openAuth}
        onCopyShareLink={handleCopyShareLink}
      />

      {/* Welcoming Repo Leaderboard (AC7) */}
      <LeaderboardTable repos={repos} />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Connect GitHub to Track Hacktoberfest"
        description="Sign in to track your pull requests, monitor merge speed, and earn verified completion cards."
        source="hacktoberfest"
      />
    </div>
  );
}

function HeroHeader() {
  return (
    <div className="rounded-3xl glass-panel p-6 sm:p-10 border border-white/[0.1] shadow-xs">
      <div className="flex flex-wrap items-center gap-2 mb-3.5">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-1 text-xs font-semibold text-white font-mono shadow-xs">
          <Flame className="h-3.5 w-3.5" /> Hacktoberfest 2026 Welcome Hub
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl glass-card px-3 py-1 text-xs font-semibold text-white font-mono shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" /> C-Rank™ S/A/B Rated
        </span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-space">
        Hacktoberfest 2026 Welcome Hub
      </h1>
      <p className="mt-3 text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed font-sans">
        Discover verified newcomer-welcoming repositories with responsive maintainers and track your live{" "}
        <strong>4 pull request merges</strong> in real time.
      </p>
    </div>
  );
}

function PreEventBanner() {
  return (
    <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-white/[0.1] shadow-xs text-center">
      <div className="inline-flex p-3 rounded-2xl bg-orange-500/10 text-orange-400 mb-3">
        <CalendarClock className="h-6 w-6" />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-white font-space">
        Hacktoberfest Starts October 1
      </h2>
      <p className="text-xs text-zinc-300 max-w-md mx-auto mt-1">
        Live merge tracking opens when the event begins. Until then, explore the welcoming
        repositories below and pick your first issues.
      </p>
    </div>
  );
}

function PostEventBanner({
  mergedCount,
  cardIssued,
  shareUrl,
}: {
  mergedCount: number;
  cardIssued: boolean;
  shareUrl?: string;
}) {
  return (
    <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-white/[0.1] shadow-xs text-center">
      <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-3">
        <Trophy className="h-6 w-6" />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-white font-space">
        Hacktoberfest 2026 Has Ended
      </h2>
      <p className="text-xs text-zinc-300 max-w-md mx-auto mt-1">
        Merges are frozen at <strong>{mergedCount} verified PRs</strong>. The leaderboard below
        stays open year-round for finding welcoming repos.
      </p>
      {cardIssued && shareUrl && (
        <Link
          href={shareUrl}
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
        >
          <Trophy className="h-3.5 w-3.5 text-amber-300" />
          View Completion Card
        </Link>
      )}
    </div>
  );
}
