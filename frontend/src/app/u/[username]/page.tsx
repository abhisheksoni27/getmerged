import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  getPublicProfile,
  isReservedUsername,
  isValidUsername,
  type PublicProfile,
} from "@/lib/public-profile";
import { GitPullRequest, Target, Merge, ShieldCheck, Calendar, ExternalLink, Flame } from "lucide-react";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

// AC3: rendered per-request with Cache-Control: private, no-store (next.config)
// until a tag-based purge path exists for is_public flips.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    return { title: "Profile Not Found - GetMerged" };
  }

  const title = `${profile.username} (@${profile.slug}) - Contributor Track Record | GetMerged`;
  const description = `${profile.username}'s verified open-source forecast record on GetMerged: ${profile.total_evals} PR forecasts, ${profile.merged_count} merged, with repo C-Rank tiers.`;
  const ogUrl = `/api/og/u/${encodeURIComponent(profile.slug)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${profile.username} contributor track record` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-brand-dark bg-white p-5 shadow-[4px_4px_0px_#222831]">
      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500">
        {icon} {label}
      </div>
      <div className="mt-2 text-3xl font-extrabold font-mono text-zinc-900">{value}</div>
    </div>
  );
}

const TIER_CLS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 border-emerald-300",
  B: "bg-sky-100 text-sky-800 border-sky-300",
  C: "bg-violet-100 text-violet-800 border-violet-300",
  "C+": "bg-violet-100 text-violet-800 border-violet-300",
  D: "bg-zinc-100 text-zinc-700 border-zinc-300",
};

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  // AC2 route-level charset + reserved-name block; privacy gate (API 404s
  // non-public) below.
  if (!username || !isValidUsername(username) || isReservedUsername(username)) notFound();

  const profile: PublicProfile | null = await getPublicProfile(username);
  if (!profile) notFound();

  // AC1: zero-eval users show 'No forecasts yet'; accuracy stays hidden.
  const hasEvals = profile.total_evals > 0;
  const accuracyPct =
    profile.accuracy_rate !== null && profile.accuracy_n > 0
      ? Math.round(profile.accuracy_rate * 100)
      : null;
  // AC2: eval feed is capped server-side at the latest 20.
  const evalFeed = profile.evals ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-zinc-900 font-sans">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8 rounded-2xl bg-white p-6 sm:p-8 border-2 border-brand-dark shadow-[6px_6px_0px_#222831]">
          <div className="flex items-center gap-4">
            {profile.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-14 w-14 rounded-full border-2 border-zinc-200"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black font-space text-zinc-900 truncate">
                {profile.username}
              </h1>
              <p className="text-xs font-mono text-zinc-500 flex items-center gap-1.5 mt-1">
                <Calendar className="h-3 w-3" />
                Tracking forecasts since{" "}
                {new Date(profile.member_since).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
            Verified open-source track record: every PR forecast below was scored against the real
            merge outcome on GetMerged.
          </p>
        </div>

        {profile.season && !!profile.level && profile.level > 0 && (
          <div className="mb-8 rounded-2xl bg-[#FDFBF7] p-5 border-2 border-brand-dark shadow-[4px_4px_0px_#222831]">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-500" /> Contributor Season · {profile.season}
              </h2>
              <Link
                href="/leaderboard"
                title="View the weekly contributor leaderboard"
                className="inline-flex items-center rounded-lg border border-zinc-300 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 hover:border-emerald-500 hover:text-emerald-700 bg-white"
              >
                Leaderboard →
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border-b-4 border-black bg-white px-3 py-2">
                <div className="text-[10px] font-mono uppercase text-zinc-500">Level</div>
                <div className="text-2xl font-extrabold font-mono text-zinc-900">{profile.level}</div>
              </div>
              <div className="rounded-lg border-b-4 border-black bg-white px-3 py-2">
                <div className="text-[10px] font-mono uppercase text-zinc-500">Season XP</div>
                <div className="text-2xl font-extrabold font-mono text-emerald-700">{profile.season_xp ?? 0}</div>
              </div>
              <div className="rounded-lg border-b-4 border-black bg-white px-3 py-2">
                <div className="text-[10px] font-mono uppercase text-zinc-500">Streak</div>
                <div className="text-2xl font-extrabold font-mono text-zinc-900">
                  {profile.streak_weeks ?? 0}
                  <span className="text-xs font-semibold text-zinc-500">wk</span>
                </div>
              </div>
              <div className="rounded-lg border-b-4 border-black bg-white px-3 py-2">
                <div className="text-[10px] font-mono uppercase text-zinc-500">Season rank</div>
                <div className="text-2xl font-extrabold font-mono text-violet-700">
                  {typeof profile.season_rank === "number" ? `#${profile.season_rank}` : "—"}
                </div>
              </div>
            </div>
          </div>
        )}

        {!hasEvals ? (
          <div
            data-testid="no-forecasts"
            className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500"
          >
            No forecasts yet.
            <div className="mt-2">
              <Link href="/preflight" className="text-emerald-700 font-semibold hover:underline">
                Test your first PR free →
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatTile
                icon={<GitPullRequest className="h-3.5 w-3.5" />}
                label="Total evals"
                value={profile.total_evals}
              />
              <StatTile
                icon={<Target className="h-3.5 w-3.5" />}
                label="Forecast accuracy"
                value={accuracyPct !== null ? `${accuracyPct}%` : "—"}
              />
              <StatTile
                icon={<Merge className="h-3.5 w-3.5" />}
                label="Merged"
                value={profile.merged_count}
              />
            </div>

            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Repos merged into (C-Rank tier)
            </h2>
            {profile.repos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
                No merged pull records yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {profile.repos.map((repo) => (
                  <li
                    key={repo.full_name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-[2px_2px_0px_#000]/5"
                  >
                    <Link
                      href={`/${repo.full_name}`}
                      className="truncate text-sm font-semibold text-zinc-900 hover:text-emerald-700"
                    >
                      {repo.full_name} <ExternalLink className="inline h-3 w-3 text-zinc-400" />
                    </Link>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold font-mono border ${
                        TIER_CLS[repo.c_rank_tier] ?? TIER_CLS.D
                      }`}
                    >
                      {repo.c_rank_tier}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {hasEvals && evalFeed.length > 0 && (
          <>
            <h2 className="mt-8 text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
              <GitPullRequest className="h-3.5 w-3.5 text-emerald-600" /> Latest forecasts
            </h2>
            <ul className="space-y-2">
              {evalFeed.map((ev, i) => (
                <li
                  key={`${ev.repository_full_name}-${ev.pr_number ?? i}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-zinc-900">
                      {ev.repository_full_name}
                      {ev.pr_number ? (
                        <span className="text-zinc-400 font-mono"> #{ev.pr_number}</span>
                      ) : null}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      forecast {ev.predicted_score} ·{" "}
                      {new Date(ev.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold font-mono border ${
                      ev.outcome === "hit"
                        ? TIER_CLS.A
                        : ev.outcome === "miss"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : TIER_CLS.D
                    }`}
                  >
                    {ev.outcome === "hit" ? "MERGED ✓" : ev.outcome === "miss" ? "NOT MERGED" : "PENDING"}
                  </span>
                </li>
              ))}
            </ul>
            {profile.total_evals > evalFeed.length && (
              <Link
                href="/dashboard"
                data-testid="show-more-evals"
                className="mt-4 inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:border-emerald-500 hover:text-emerald-700"
              >
                Show all {profile.total_evals} evals in dashboard export →
              </Link>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
