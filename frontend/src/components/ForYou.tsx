"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Lock, CalendarDays, ExternalLink, Star } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface LangCount {
  lang: string;
  count: number;
}

interface ForYouRepo {
  id: string;
  full_name: string;
  language: string | null;
  stars: number;
  description: string | null;
  github_url: string;
  c_rank_tier: string;
  c_rank_score: number;
}

interface ForYouIssue {
  id: number;
  repository_id: string;
  repo_full_name: string;
  language: string;
  title: string;
  url: string;
}

interface ForYouData {
  is_pro: boolean;
  snapshot: LangCount[];
  locked_languages: number;
  snapshot_updated_at: string | null;
  stale: boolean;
  repos: ForYouRepo[];
  issues: ForYouIssue[];
}

const tierCls: Record<string, string> = {
  S: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 border border-emerald-300",
  A: "bg-sky-100 text-sky-800 border border-sky-300",
};

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ForYou renders the personalized "For You" feed on /dashboard: S/A C-Rank
// repos + open good-first-issues matched to the user's GitHub language
// snapshot. Free users see their top 3 languages; extra languages render as
// locked rows with an upgrade CTA (Pro $9/mo).
export function ForYou() {
  const [data, setData] = useState<ForYouData | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // AC4: non-blocking banner when GitHub sync failed during login.
    if (typeof document !== "undefined" && document.cookie.includes("opendoor_sync_failed=1")) {
      setSyncFailed(true);
      document.cookie = "opendoor_sync_failed=; Max-Age=-1; path=/";
    }

    fetch(`${API_BASE_URL}/api/v1/user/for-you`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    if (syncFailed) {
      return (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-950/70 border-amber-800/80 p-3 text-xs text-amber-300">
          GitHub sync failed - using saved preferences
        </div>
      );
    }
    return null;
  }

  const matchedOn = fmtDate(data.snapshot_updated_at);
  const hasSnapshot = data.snapshot.length > 0;

  return (
    <section aria-label="For You" className="rounded-2xl border border-emerald-200/70 glass-panel p-6 shadow-sm mb-8">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-bold tracking-tight text-white">For You</h2>
        {matchedOn && !data.stale && (
          <span className="inline-flex items-center gap-1 text-xs font-mono text-zinc-300" data-testid="foryou-matched-on">
            <CalendarDays className="h-3 w-3" /> matched from GitHub on {matchedOn}
          </span>
        )}
      </div>

      {/* AC4: sync failure banner */}
      {syncFailed && (
        <div data-testid="sync-failed-banner" className="mt-3 rounded-lg border border-amber-200 bg-amber-950/70 border-amber-800/80 px-3 py-2 text-xs text-amber-300">
          GitHub sync failed - using saved preferences
        </div>
      )}

      {/* AC3: snapshot older than 30 days falls back to manual filter UI */}
      {!hasSnapshot || data.stale ? (
        hasSnapshot && data.stale ? (
          <>
            <p className="mt-3 text-sm text-zinc-300">
              Your language snapshot is over 30 days old. Log in again with GitHub to refresh it, or browse manually:
            </p>
            <Link
              href={`/repos?languages=${encodeURIComponent(data.snapshot.map((l) => l.lang).join(","))}`}
              className="mt-2 inline-block rounded-lg glass-card px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Browse repos with filters →
            </Link>
          </>
        ) : (
          /* AC2: empty state when zero matches */
          <div className="mt-3 rounded-xl border border-dashed border-white/[0.12] glass-panel/60 p-8 text-center text-sm text-zinc-300">
            No personalized matches yet - we couldn&apos;t find S/A ranked repos or good first issues for your GitHub languages.
            <div className="mt-2">
              <Link href="/repos" className="text-emerald-400 font-semibold hover:underline">
                Browse all repos manually →
              </Link>
            </div>
          </div>
        )
      ) : (
        <>
          {data.repos.length > 0 ? (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2" data-testid="foryou-repos">
              {data.repos.map((r) => (
                <li key={r.id} className="flex flex-col rounded-xl border border-white/[0.1] glass-panel p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/repo/${r.full_name}`} className="text-sm font-semibold text-white hover:text-emerald-400">
                      {r.full_name}
                    </Link>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${tierCls[r.c_rank_tier] ?? "glass-card text-zinc-300 border border-white/[0.12]"}`}>
                      {r.c_rank_tier}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-300">{r.description || "No description available."}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-300">
                    {r.language && <span className="rounded-full glass-card px-2 py-0.5 font-medium capitalize">{r.language}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3" /> {r.stars.toLocaleString()}
                    </span>
                    <span className="ml-auto font-mono">C-Rank {Math.round(r.c_rank_score)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-zinc-300">No S/A C-Rank repos match your languages right now.</p>
          )}

          {data.issues.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-bold text-white">Open good first issues in your stack</h3>
              <ul className="mt-2 space-y-2" data-testid="foryou-issues">
                {data.issues.map((issue) => (
                  <li key={issue.id} className="rounded-lg border border-white/[0.1] glass-panel px-4 py-2.5 text-sm">
                    <a href={issue.url} target="_blank" rel="noopener noreferrer" className="font-medium text-white hover:text-emerald-400">
                      {issue.title} <ExternalLink className="inline h-3 w-3 text-zinc-300" />
                    </a>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-300">
                      <span>{issue.repo_full_name}</span>
                      {issue.language && <span className="capitalize">· {issue.language}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {data.repos.length === 0 && data.issues.length === 0 && (
            <div className="mt-3 rounded-xl border border-dashed border-white/[0.12] glass-panel/60 p-8 text-center text-sm text-zinc-300">
              No personalized matches yet - we couldn&apos;t find S/A ranked repos or good first issues for your GitHub languages.
              <div className="mt-2">
                <Link href="/repos" className="text-emerald-400 font-semibold hover:underline">
                  Browse all repos manually →
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* AC5: Pro paywall boundary - locked rows with upgrade CTA */}
      {data.locked_languages > 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-950/70 border-amber-800/80/70 p-4" data-testid="foryou-locked">
          <ul className="space-y-1.5">
            {Array.from({ length: data.locked_languages }).map((_, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="h-2.5 w-24 animate-pulse rounded bg-amber-200" />
                <span className="text-xs">locked language match</span>
              </li>
            ))}
          </ul>
          <Link
            href="/pricing"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
          >
            <Lock className="h-3 w-3" /> Unlock all {data.snapshot.length + data.locked_languages} languages with Pro - $9/mo
          </Link>
        </div>
      )}
    </section>
  );
}
