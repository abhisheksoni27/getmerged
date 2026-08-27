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
import OpenToOpportunitiesToggle from "@/components/OpenToOpportunitiesToggle";
import ShareCardButton from "@/components/ShareCardButton";
import {
  GitPullRequest,
  Target,
  Merge,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Flame,
  Code2,
  Sparkles,
  Zap,
  Star,
  Copy,
  Clock,
  Briefcase,
  Award,
} from "lucide-react";
import { LangLogo } from "@/components/LangLogo";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    return { title: "Profile Not Found - GetMerged" };
  }

  const title = `${profile.username} (@${profile.slug}) - Verified Open Source Resume | GetMerged`;
  const description = `${profile.username}'s verified open-source contribution record: ${profile.total_evals} PR forecasts, ${profile.merged_count} merged, DNA archetype, and C-Rank repo tiers.`;
  const ogUrl = `/api/og/u/${encodeURIComponent(profile.slug)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${profile.username} verified contributor resume` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

const TIER_CLS: Record<string, string> = {
  S: "bg-emerald-100 text-emerald-900 border-emerald-300",
  A: "bg-blue-100 text-blue-900 border-blue-300",
  B: "bg-amber-100 text-amber-900 border-amber-300",
  C: "bg-purple-100 text-purple-900 border-purple-300",
  "C+": "bg-purple-100 text-purple-900 border-purple-300",
  D: "bg-zinc-100 text-zinc-700 border-zinc-300",
};

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  if (!username || !isValidUsername(username) || isReservedUsername(username)) notFound();

  const profile: PublicProfile | null = await getPublicProfile(username);
  if (!profile) notFound();

  const hasEvals = profile.total_evals > 0;
  const accuracyPct =
    profile.accuracy_rate !== null && profile.accuracy_n > 0
      ? Math.round(profile.accuracy_rate * 100)
      : null;
  const evalFeed = profile.evals ?? [];
  const dna = profile.dna;

  // Language breakdown computation
  const languages = dna?.language_breakdown ? Object.entries(dna.language_breakdown) : [];
  const totalLangPRs = languages.reduce((acc, [, count]) => acc + count, 0);

  // Markdown badge string for one-click embed
  const badgeMarkdown = `[![GetMerged Verified Contributor](https://getmerged.abhishekco.de/api/badge/u/${profile.slug})](https://getmerged.abhishekco.de/u/${profile.slug})`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-zinc-900 font-sans dev-grid-pattern">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-10">
        {/* Section 1: Executive Contributor Header */}
        <div className="mb-6 rounded-3xl bg-white p-6 sm:p-8 border border-zinc-200 shadow-xs border-b-4 border-b-zinc-900">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-zinc-200 shadow-2xs object-cover shrink-0"
                />
              ) : (
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-space font-bold text-2xl shrink-0">
                  {profile.username.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-space text-zinc-950 truncate">
                    {profile.username}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-xs font-mono border border-zinc-200">
                    @{profile.slug}
                  </span>
                  {dna?.persona && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-mono font-bold border border-emerald-200">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      {dna.persona}
                    </span>
                  )}
                </div>

                <p className="text-xs font-mono text-zinc-500 flex items-center gap-1.5 mt-1.5">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  Verified on GetMerged since{" "}
                  {new Date(profile.member_since).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                  })}
                </p>

                <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 leading-relaxed font-sans">
                  {dna?.persona_verdict ||
                    "Verified open-source track record: every pull request and maintainer interaction is benchmarked via public GitHub telemetry."}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <ShareCardButton slug={profile.slug} username={profile.username} />
            </div>
          </div>
        </div>

        {/* Talent Pass Toggle (Isolated in own container for owner) */}
        <OpenToOpportunitiesToggle slug={profile.slug} />

        {/* Section 2: Core Telemetry KPI Quad */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-8">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs border-b-2 border-b-zinc-900">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              <Merge className="h-3.5 w-3.5 text-emerald-600" /> Merged PRs
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-space text-zinc-950">
              {dna?.total_merged_prs ?? profile.merged_count}
            </div>
            <div className="text-[10px] text-zinc-500 font-sans mt-0.5">Verified public merges</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs border-b-2 border-b-zinc-900">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              <Target className="h-3.5 w-3.5 text-blue-600" /> Forecast Accuracy
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-space text-zinc-950">
              {accuracyPct !== null ? `${accuracyPct}%` : " - "}
            </div>
            <div className="text-[10px] text-zinc-500 font-sans mt-0.5">Over settled PR evals</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs border-b-2 border-b-zinc-900">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              <Star className="h-3.5 w-3.5 text-amber-500" /> Stars Impacted
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-space text-zinc-950">
              {dna?.stars_pulled_in ? `${(dna.stars_pulled_in / 1000).toFixed(1)}k` : profile.repos.length > 0 ? `${profile.repos.length * 2}k+` : "0"}
            </div>
            <div className="text-[10px] text-zinc-500 font-sans mt-0.5">Combined repo reach</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs border-b-2 border-b-zinc-900">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              <Zap className="h-3.5 w-3.5 text-purple-600" /> Skill Level
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-extrabold font-space text-zinc-950 truncate">
              {dna?.skill_level || (profile.merged_count > 0 ? "Active" : "Novice")}
            </div>
            <div className="text-[10px] text-zinc-500 font-sans mt-0.5">{dna?.pr_size_preference || "Standard"} PR scope</div>
          </div>
        </div>

        {/* Section 3: Contributor Season & Streak Momentum */}
        {profile.season && !!profile.level && profile.level > 0 && (
          <div className="mb-8 rounded-3xl bg-white p-5 sm:p-6 border border-zinc-200 shadow-xs border-b-4 border-b-zinc-900">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-500" /> Contributor Season · {profile.season}
              </h2>
              <Link
                href="/leaderboard"
                title="View the weekly contributor leaderboard"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 font-mono"
              >
                View Leaderboard →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5">
                <div className="text-[10px] font-mono uppercase text-zinc-500">Season Level</div>
                <div className="text-xl font-extrabold font-mono text-zinc-950">{profile.level}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5">
                <div className="text-[10px] font-mono uppercase text-zinc-500">Season XP</div>
                <div className="text-xl font-extrabold font-mono text-emerald-700">{profile.season_xp ?? 0}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5">
                <div className="text-[10px] font-mono uppercase text-zinc-500">Weekly Streak</div>
                <div className="text-xl font-extrabold font-mono text-zinc-950">
                  {profile.streak_weeks ?? 0}
                  <span className="text-xs font-semibold text-zinc-500 ml-0.5">wk</span>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5">
                <div className="text-[10px] font-mono uppercase text-zinc-500">Global Rank</div>
                <div className="text-xl font-extrabold font-mono text-purple-700">
                  {typeof profile.season_rank === "number" ? `#${profile.season_rank}` : " - "}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Ecosystem & Language Proficiency Radar */}
        {languages.length > 0 && (
          <div className="mb-8 rounded-3xl bg-white p-5 sm:p-7 border border-zinc-200 shadow-xs border-b-4 border-b-zinc-900">
            <h2 className="text-sm font-bold font-space text-zinc-950 mb-3 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-blue-600" />
              Ecosystem & Language Proficiency
            </h2>
            <div className="space-y-2.5">
              {languages.slice(0, 6).map(([lang, count]) => {
                const pct = totalLangPRs > 0 ? Math.round((count / totalLangPRs) * 100) : 0;
                return (
                  <div key={lang} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-1.5 font-bold text-zinc-800">
                        <LangLogo language={lang} /> {lang}
                      </span>
                      <span className="text-zinc-500">{pct}% ({count} PRs)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                      <div className="h-full rounded-full bg-zinc-900 transition-all duration-500" style={{ width: `${Math.max(5, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 5: Elite Repositories Merged Into (C-Rank Tier Trophies) */}
        <div className="mb-8 rounded-3xl bg-white p-5 sm:p-7 border border-zinc-200 shadow-xs border-b-4 border-b-zinc-900">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold font-space text-zinc-950 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Verified Repository Merges ({profile.repos.length})
            </h2>
            <span className="text-[11px] font-mono text-zinc-500">Ranked by C-Rank™ Tier</span>
          </div>

          {profile.repos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-500 font-sans">
              No merged repository records logged yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.repos.map((repo) => (
                <div
                  key={repo.full_name}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-3.5 hover:bg-zinc-50 transition-colors"
                >
                  <Link
                    href={`/${repo.full_name}`}
                    title={`View ${repo.full_name} scorecard and merge metrics`}
                    className="truncate text-xs font-bold font-space text-zinc-900 hover:text-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{repo.full_name}</span>
                    <ExternalLink className="h-3 w-3 text-zinc-400 shrink-0" />
                  </Link>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold font-mono border ${
                      TIER_CLS[repo.c_rank_tier] ?? TIER_CLS.D
                    }`}
                  >
                    Tier {repo.c_rank_tier}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 6: Contributor Work Rhythm & Temporal Focus */}
        {dna?.temporal && (
          <div className="mb-8 rounded-3xl bg-white p-5 sm:p-7 border border-zinc-200 shadow-xs border-b-4 border-b-zinc-900">
            <h2 className="text-sm font-bold font-space text-zinc-950 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Contribution Rhythm & Code Review Dynamics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="text-[11px] font-mono text-zinc-500 font-bold uppercase">Active Window</div>
                <div className="text-base font-bold font-space text-zinc-900 mt-1">{dna.temporal.label}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Peak hour: {dna.temporal.peak_hour_utc}:00 UTC</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="text-[11px] font-mono text-zinc-500 font-bold uppercase">Avg PR Scope</div>
                <div className="text-base font-bold font-space text-zinc-900 mt-1">+{Math.round(dna.avg_additions)} / -{Math.round(dna.avg_deletions)}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{dna.avg_changed_files.toFixed(1)} files changed avg</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="text-[11px] font-mono text-zinc-500 font-bold uppercase">Review Feedback</div>
                <div className="text-base font-bold font-space text-zinc-900 mt-1">{dna.review_engagement}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Maintainer discussion depth</div>
              </div>
            </div>
          </div>
        )}

        {/* Section 7: Verified Pull Request History & Forecast Outcomes */}
        {hasEvals && evalFeed.length > 0 && (
          <div className="mb-8 rounded-3xl bg-white p-5 sm:p-7 border border-zinc-200 shadow-xs border-b-4 border-b-zinc-900">
            <h2 className="text-sm font-bold font-space text-zinc-950 mb-3 flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-emerald-600" />
              Latest Verified PR Forecasts & Outcomes
            </h2>
            <ul className="divide-y divide-zinc-100 font-mono text-xs">
              {evalFeed.map((ev, i) => (
                <li
                  key={`${ev.repository_full_name}-${ev.pr_number ?? i}-${i}`}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-xs sm:text-sm font-semibold text-zinc-900 font-sans">
                      {ev.repository_full_name}
                      {ev.pr_number ? <span className="text-zinc-400 font-mono"> #{ev.pr_number}</span> : null}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      forecast score: {ev.predicted_score} •{" "}
                      {new Date(ev.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2.5 py-0.5 text-[10px] font-bold font-mono border ${
                      ev.outcome === "hit"
                        ? TIER_CLS.A
                        : ev.outcome === "miss"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : TIER_CLS.D
                    }`}
                  >
                    {ev.outcome === "hit" ? "MERGED ✓" : ev.outcome === "miss" ? "CLOSED" : "PENDING"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Section 8: Contributor Badges & Endorsements */}
        {(() => {
          const hasSTier = profile.repos.some((r) => r.c_rank_tier === "S");
          const hasFastShip = (profile.merged_count >= 5) || (accuracyPct !== null && accuracyPct >= 80);
          const hasPolyglot = languages.length >= 3;
          const totalBadges = [hasSTier, hasFastShip, hasPolyglot].filter(Boolean).length;

          return (
            <div className="mb-8 rounded-3xl bg-white p-5 sm:p-7 border border-zinc-200 shadow-xs border-b-4 border-b-zinc-900">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-bold font-space text-zinc-950 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Earned Contributor Badges ({totalBadges}/3)
                </h2>
              </div>

              {totalBadges === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-500 font-sans">
                  No badges unlocked yet. Merge PRs into S-Tier repos or across multiple languages to earn verified badges.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {hasSTier && (
                    <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0 font-bold font-mono text-xs">
                        S
                      </div>
                      <div>
                        <div className="font-space font-bold text-xs text-zinc-900">Tier S Merged</div>
                        <div className="text-[10px] text-zinc-500 font-sans">Strict review acceptance</div>
                      </div>
                    </div>
                  )}

                  {hasFastShip && (
                    <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-800 shrink-0 font-bold font-mono text-xs">
                        ⚡
                      </div>
                      <div>
                        <div className="font-space font-bold text-xs text-zinc-900">Fast Shipper</div>
                        <div className="text-[10px] text-zinc-500 font-sans">High accuracy & merge count</div>
                      </div>
                    </div>
                  )}

                  {hasPolyglot && (
                    <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-800 shrink-0 font-bold font-mono text-xs">
                        🌐
                      </div>
                      <div>
                        <div className="font-space font-bold text-xs text-zinc-900">Ecosystem Polyglot</div>
                        <div className="text-[10px] text-zinc-500 font-sans">3+ language PRs</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Section 9: Embeddable Resume Markdown Badge */}
        <div className="mb-8 rounded-3xl bg-white p-5 sm:p-7 border border-zinc-200 shadow-xs border-b-4 border-b-zinc-900">
          <h2 className="text-sm font-bold font-space text-zinc-950 mb-2 flex items-center gap-2">
            <Copy className="h-4 w-4 text-zinc-700" />
            Embed on GitHub README or Resume
          </h2>
          <p className="text-xs text-zinc-600 font-sans mb-3">
            Copy the markdown badge below to showcase your verified GetMerged contributor score directly in your GitHub profile README.
          </p>
          <div className="flex items-center gap-2 bg-zinc-900 text-zinc-200 p-3 rounded-xl font-mono text-xs overflow-x-auto">
            <code className="flex-1 whitespace-nowrap">{badgeMarkdown}</code>
          </div>
        </div>

        {/* Section 10: Recruiter & Opportunities Contact CTA */}
        <div className="rounded-3xl bg-zinc-900 text-white p-6 sm:p-8 shadow-xs border-2 border-black">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold mb-2">
                <Briefcase className="h-3.5 w-3.5" /> Recruiter Verified
              </div>
              <h3 className="text-xl sm:text-2xl font-bold font-space text-white">
                Interested in working with {profile.username}?
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 font-sans mt-1.5 max-w-lg">
                View this contributor&apos;s verified public repositories, code style, and telemetry history above.
              </p>
            </div>
            <a
              href={`https://github.com/${profile.username}`}
              target="_blank"
              rel="nofollow noopener noreferrer"
              title={`View ${profile.username} on GitHub`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold font-sans text-zinc-950 hover:bg-zinc-100 transition-all shadow-xs shrink-0 cursor-pointer active:scale-[0.98]"
            >
              <ExternalLink className="h-4 w-4" />
              GitHub Profile
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

