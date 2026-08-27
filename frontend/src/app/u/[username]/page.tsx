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

const TIER_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  S: { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/20" },
  A: { bg: "bg-blue-500/10", text: "text-blue-700", border: "border-blue-500/20" },
  B: { bg: "bg-amber-500/10", text: "text-amber-700", border: "border-amber-500/20" },
  C: { bg: "bg-purple-500/10", text: "text-purple-700", border: "border-purple-500/20" },
  "C+": { bg: "bg-purple-500/10", text: "text-purple-700", border: "border-purple-500/20" },
  D: { bg: "bg-zinc-500/10", text: "text-zinc-700", border: "border-zinc-500/20" },
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
    <div className="min-h-screen flex flex-col bg-[#FCFCFD] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 sm:px-10 py-16 sm:py-24">
        {/* Section 1: Executive Contributor Identity & Hero */}
        <section className="mb-16">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-zinc-100">
            <div className="flex items-start gap-6 min-w-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-full ring-1 ring-zinc-200/80 shadow-xs object-cover shrink-0"
                />
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-zinc-900 text-white flex items-center justify-center font-space font-semibold text-2xl shrink-0">
                  {profile.username.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] text-zinc-950">
                    {profile.username}
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 text-xs font-mono font-medium">
                    @{profile.slug}
                  </span>
                  {dna?.persona && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200/60">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      {dna.persona}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2 text-xs font-mono text-zinc-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Verified since{" "}
                    {new Date(profile.member_since).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>

                <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed font-sans max-w-2xl">
                  {dna?.persona_verdict ||
                    "Verified open-source track record: every pull request and maintainer interaction is benchmarked via public GitHub telemetry."}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <ShareCardButton slug={profile.slug} username={profile.username} />
            </div>
          </div>
        </section>

        {/* Talent Pass Toggle (Quiet & Minimal) */}
        <div className="mb-14">
          <OpenToOpportunitiesToggle slug={profile.slug} />
        </div>

        {/* Section 2: Telemetry Metrics Ribbon */}
        <section className="mb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8 px-6 sm:px-8 rounded-3xl bg-white/70 backdrop-blur-sm border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
                <Merge className="h-3.5 w-3.5 text-emerald-600" /> Merged PRs
              </div>
              <div className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-zinc-950">
                {dna?.total_merged_prs ?? profile.merged_count}
              </div>
              <div className="text-xs text-zinc-400 font-sans mt-1">Verified public merges</div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
                <Target className="h-3.5 w-3.5 text-blue-600" /> Forecast Accuracy
              </div>
              <div className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-zinc-950">
                {accuracyPct !== null ? `${accuracyPct}%` : " - "}
              </div>
              <div className="text-xs text-zinc-400 font-sans mt-1">Over settled evaluations</div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
                <Star className="h-3.5 w-3.5 text-amber-500" /> Stars Impacted
              </div>
              <div className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-zinc-950">
                {dna?.stars_pulled_in
                  ? `${(dna.stars_pulled_in / 1000).toFixed(1)}k`
                  : profile.repos.length > 0
                  ? `${profile.repos.length * 2}k+`
                  : "0"}
              </div>
              <div className="text-xs text-zinc-400 font-sans mt-1">Combined repository reach</div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
                <Zap className="h-3.5 w-3.5 text-purple-600" /> Skill Level
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 truncate">
                {dna?.skill_level || (profile.merged_count > 0 ? "Active" : "Novice")}
              </div>
              <div className="text-xs text-zinc-400 font-sans mt-1">{dna?.pr_size_preference || "Standard"} PR scope</div>
            </div>
          </div>
        </section>

        {/* Section 3: Season & Momentum (Conditional) */}
        {profile.season && !!profile.level && profile.level > 0 && (
          <section className="mb-20">
            <div className="flex items-center justify-between gap-4 mb-6">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400">
                02 / Contributor Momentum · {profile.season}
              </span>
              <Link
                href="/leaderboard"
                title="View the weekly contributor leaderboard"
                className="text-xs font-medium text-zinc-600 hover:text-zinc-950 transition-colors font-mono"
              >
                Leaderboard →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-zinc-200/60">
                <div className="text-[11px] font-mono uppercase text-zinc-400">Season Level</div>
                <div className="text-2xl font-semibold text-zinc-950 mt-1 font-mono">{profile.level}</div>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-zinc-200/60">
                <div className="text-[11px] font-mono uppercase text-zinc-400">Season XP</div>
                <div className="text-2xl font-semibold text-emerald-600 mt-1 font-mono">{profile.season_xp ?? 0}</div>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-zinc-200/60">
                <div className="text-[11px] font-mono uppercase text-zinc-400">Weekly Streak</div>
                <div className="text-2xl font-semibold text-zinc-950 mt-1 font-mono">
                  {profile.streak_weeks ?? 0}
                  <span className="text-xs font-normal text-zinc-400 ml-1">wks</span>
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-zinc-200/60">
                <div className="text-[11px] font-mono uppercase text-zinc-400">Global Rank</div>
                <div className="text-2xl font-semibold text-purple-600 mt-1 font-mono">
                  {typeof profile.season_rank === "number" ? `#${profile.season_rank}` : " - "}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 4: Ecosystem & Language Proficiency */}
        {languages.length > 0 && (
          <section className="mb-20">
            <div className="mb-6">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400">
                03 / Ecosystem & Language Proficiency
              </span>
            </div>
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-zinc-200/60 space-y-4">
              {languages.slice(0, 6).map(([lang, count]) => {
                const pct = totalLangPRs > 0 ? Math.round((count / totalLangPRs) * 100) : 0;
                return (
                  <div key={lang} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-2 font-medium text-zinc-800">
                        <LangLogo language={lang} /> {lang}
                      </span>
                      <span className="text-zinc-400">{pct}% · {count} PRs</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-900 transition-all duration-700 ease-out"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 5: Elite Repositories Merged Into */}
        <section className="mb-20">
          <div className="flex items-center justify-between gap-4 mb-6">
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400">
              04 / Verified Repository Merges ({profile.repos.length})
            </span>
            <span className="text-[11px] font-mono text-zinc-400">C-Rank™ Graded</span>
          </div>

          {profile.repos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 p-12 text-center text-xs text-zinc-400">
              No merged repository records logged yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.repos.map((repo) => {
                const badge = TIER_BADGE[repo.c_rank_tier] ?? TIER_BADGE.D;
                return (
                  <div
                    key={repo.full_name}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/60 bg-white p-4 hover:border-zinc-300 transition-all group"
                  >
                    <Link
                      href={`/${repo.full_name}`}
                      title={`View ${repo.full_name} scorecard and merge metrics`}
                      className="truncate text-xs sm:text-sm font-medium text-zinc-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="truncate">{repo.full_name}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-600 shrink-0 transition-colors" />
                    </Link>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold font-mono border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      Tier {repo.c_rank_tier}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 6: Contributor Work Rhythm */}
        {dna?.temporal && (
          <section className="mb-20">
            <div className="mb-6">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400">
                05 / Contribution Rhythm & Temporal Dynamics
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 rounded-2xl bg-white border border-zinc-200/60">
                <div className="text-[11px] font-mono text-zinc-400 uppercase">Active Window</div>
                <div className="text-lg font-semibold text-zinc-950 mt-1">{dna.temporal.label}</div>
                <div className="text-xs text-zinc-400 mt-1">Peak: {dna.temporal.peak_hour_utc}:00 UTC</div>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-zinc-200/60">
                <div className="text-[11px] font-mono text-zinc-400 uppercase">Average Scope</div>
                <div className="text-lg font-semibold text-zinc-950 mt-1">
                  +{Math.round(dna.avg_additions)} / -{Math.round(dna.avg_deletions)}
                </div>
                <div className="text-xs text-zinc-400 mt-1">{dna.avg_changed_files.toFixed(1)} files changed avg</div>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-zinc-200/60">
                <div className="text-[11px] font-mono text-zinc-400 uppercase">Review Dynamics</div>
                <div className="text-lg font-semibold text-zinc-950 mt-1">{dna.review_engagement}</div>
                <div className="text-xs text-zinc-400 mt-1">Maintainer discussion depth</div>
              </div>
            </div>
          </section>
        )}

        {/* Section 7: Verified Pull Request History & Forecast Outcomes */}
        {hasEvals && evalFeed.length > 0 && (
          <section className="mb-20">
            <div className="mb-6">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400">
                06 / Latest Verified PR Forecasts & Outcomes
              </span>
            </div>
            <div className="rounded-3xl bg-white border border-zinc-200/60 divide-y divide-zinc-100 font-mono text-xs overflow-hidden">
              {evalFeed.map((ev, i) => (
                <div
                  key={`${ev.repository_full_name}-${ev.pr_number ?? i}-${i}`}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-zinc-50/50 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-xs sm:text-sm font-medium text-zinc-900 font-sans">
                      {ev.repository_full_name}
                      {ev.pr_number ? <span className="text-zinc-400 font-mono"> #{ev.pr_number}</span> : null}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      score: {ev.predicted_score} ·{" "}
                      {new Date(ev.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-0.5 text-[10px] font-semibold font-mono border ${
                      ev.outcome === "hit"
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                        : ev.outcome === "miss"
                        ? "bg-red-500/10 text-red-700 border-red-500/20"
                        : "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
                    }`}
                  >
                    {ev.outcome === "hit" ? "MERGED ✓" : ev.outcome === "miss" ? "CLOSED" : "PENDING"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 8: Contributor Badges & Endorsements */}
        {(() => {
          const hasSTier = profile.repos.some((r) => r.c_rank_tier === "S");
          const hasFastShip = profile.merged_count >= 5 || (accuracyPct !== null && accuracyPct >= 80);
          const hasPolyglot = languages.length >= 3;
          const totalBadges = [hasSTier, hasFastShip, hasPolyglot].filter(Boolean).length;

          return (
            <section className="mb-20">
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400">
                  07 / Earned Contributor Badges ({totalBadges}/3)
                </span>
              </div>

              {totalBadges === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-200 p-10 text-center text-xs text-zinc-400">
                  No badges unlocked yet. Merge PRs into S-Tier repos or across multiple languages to earn verified badges.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {hasSTier && (
                    <div className="p-5 rounded-2xl bg-white border border-zinc-200/60 flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 shrink-0 font-bold font-mono text-sm">
                        S
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-zinc-900">Tier S Merged</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">Strict review acceptance</div>
                      </div>
                    </div>
                  )}

                  {hasFastShip && (
                    <div className="p-5 rounded-2xl bg-white border border-zinc-200/60 flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-700 shrink-0 font-bold font-mono text-sm">
                        ⚡
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-zinc-900">Fast Shipper</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">High accuracy & merges</div>
                      </div>
                    </div>
                  )}

                  {hasPolyglot && (
                    <div className="p-5 rounded-2xl bg-white border border-zinc-200/60 flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-700 shrink-0 font-bold font-mono text-sm">
                        🌐
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-zinc-900">Ecosystem Polyglot</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">Active in 3+ languages</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })()}

        {/* Section 9: Embeddable Resume Markdown Badge */}
        <section className="mb-20">
          <div className="mb-6">
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400">
              08 / Embeddable Contributor Badge
            </span>
          </div>
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-zinc-200/60">
            <h2 className="text-base font-semibold text-zinc-950 mb-1 flex items-center gap-2">
              <Copy className="h-4 w-4 text-zinc-600" />
              Embed on GitHub README or Personal Site
            </h2>
            <p className="text-xs text-zinc-500 font-sans mb-4">
              Add your live verified contributor badge directly into your GitHub profile README.
            </p>
            <div className="flex items-center gap-2 bg-zinc-950 text-zinc-300 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-zinc-800">
              <code className="flex-1 whitespace-nowrap">{badgeMarkdown}</code>
            </div>
          </div>
        </section>

        {/* Section 10: Recruiter & Opportunities Contact CTA */}
        <section>
          <div className="rounded-3xl bg-zinc-950 text-white p-8 sm:p-10 border border-zinc-800/80 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-medium mb-3">
                  <Briefcase className="h-3.5 w-3.5" /> Recruiter Verified
                </div>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
                  Interested in working with {profile.username}?
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 font-sans mt-2 max-w-lg">
                  View this contributor&apos;s verified public repositories, code style, and telemetry history above.
                </p>
              </div>
              <a
                href={`https://github.com/${profile.username}`}
                target="_blank"
                rel="nofollow noopener noreferrer"
                title={`View ${profile.username} on GitHub`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 transition-all shadow-xs shrink-0 cursor-pointer active:scale-[0.98]"
              >
                <ExternalLink className="h-4 w-4" />
                GitHub Profile
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

