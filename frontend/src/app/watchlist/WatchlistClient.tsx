"use client";

import Link from "next/link";
import { Bookmark, Compass } from "lucide-react";
import { WatchedRepoCard } from "./components/WatchedRepoCard";
import { WatchlistEmptyState } from "./components/WatchlistEmptyState";
import { WebhookChannels } from "./components/WebhookChannels";
import { useWatchlistData } from "./components/useWatchlistData";

// Re-exported for existing importers (e.g. page.tsx imports WatchedRepoItem from here).
export type { SnapshotHistoryItem, WatchedRepoItem, WatchlistWebhook } from "./components/watchlistTypes";
export type { WatchedCardProps } from "./components/WatchedRepoCard";
export type { TierDeltaProps } from "./components/TierDeltaIndicatorChip";
export { TierDeltaIndicatorChip } from "./components/TierDeltaIndicatorChip";
export { WatchedRepoCard } from "./components/WatchedRepoCard";
export { WatchlistEmptyState } from "./components/WatchlistEmptyState";
export { WebhookChannels } from "./components/WebhookChannels";
export { useWatchlistData } from "./components/useWatchlistData";
import type { WatchedRepoItem } from "./components/watchlistTypes";

export interface WatchlistClientProps {
  initialItems: WatchedRepoItem[];
}

export function WatchlistClient({ initialItems }: WatchlistClientProps) {
  const { items, alerts, showLoading, hasItems, savedCount, handleUnwatch, handleToggleAlerts } =
    useWatchlistData(initialItems);

  // Early returns for body states; hero header + webhooks always render.
  let body: React.ReactNode;
  if (showLoading) {
    body = (
      <div className="py-20 flex justify-center items-center">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--border-subtle)] border-t-[var(--brand-terracotta)] animate-spin" />
      </div>
    );
  } else if (hasItems) {
    body = (
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
    );
  } else {
    body = <WatchlistEmptyState />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Watchlist Hero Header */}
        <div className="mb-8 border-b border-[var(--border-subtle)] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-space text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
                My Watchlist
              </h1>
              <span className="bg-emerald-50 text-[#0D9668] border border-emerald-200 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Bookmark className="h-3 w-3" />
                <span>{savedCount} saved</span>
              </span>
            </div>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] font-sans mt-2 max-w-2xl">
              Track live C-Rank™ tier shifts, maintainer response velocity, and telemetry changes for your saved open-source repositories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link prefetch={false}
              href="/repos"
              title="Explore all indexed open source repositories"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--brand-terracotta)] hover:text-[var(--brand-terracotta)] font-sans text-xs font-semibold shadow-xs transition-all no-underline"
            >
              <Compass className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
              <span>Explore More Repos</span>
            </Link>
          </div>
        </div>

        {/* Slack/Discord webhook alert channels */}
        <WebhookChannels />

        {body}
      </div>
    </div>
  );
}
