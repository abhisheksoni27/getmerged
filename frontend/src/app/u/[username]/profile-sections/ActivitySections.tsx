"use client";

import React from "react";
import Link from "next/link";
import type { PublicProfile } from "@/lib/public-profile";
import { LangLogo } from "@/components/LangLogo";
import { KpiCard, SeasonStat, SectionShell, StatRow, BadgeTile } from "./shared";
import {
  Award,
  Clock,
  Code2,
  Flame,
  GitPullRequest,
  Merge,
  Star,
  Target,
  Zap,
} from "lucide-react";

interface ActivitySectionsProps {
  profile: PublicProfile;
  accuracyPct: number | null;
  hasEvals: boolean;
  evalFeed: NonNullable<PublicProfile["evals"]>;
  languages: [string, number][];
  totalLangPRs: number;
}

export const ActivitySections: React.FC<ActivitySectionsProps> = ({
  profile,
  accuracyPct,
  hasEvals,
  evalFeed,
  languages,
  totalLangPRs,
}) => {
  if (!profile) return null;
  const dna = profile.dna;

  const hasSTier = profile.repos.some((r) => r.c_rank_tier === "S");
  const hasFastShip = profile.merged_count >= 5 || (accuracyPct !== null && accuracyPct >= 80);
  const hasPolyglot = languages.length >= 3;
  const totalBadges = [hasSTier, hasFastShip, hasPolyglot].filter(Boolean).length;

  return (
    <>
      {/* Section 4: Core Telemetry KPI Quad (2x2 Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <KpiCard
          icon={<Merge className="h-4 w-4 text-emerald-400" />}
          title="Merged PRs"
          accent="border-t-emerald-500"
          value={dna?.total_merged_prs ?? profile.merged_count}
          sub="Verified public merges"
        />
        <KpiCard
          icon={<Target className="h-4 w-4 text-blue-400" />}
          title="Accuracy"
          accent="border-t-blue-500"
          value={accuracyPct !== null ? `${accuracyPct}%` : " - "}
          sub="Over settled PR evals"
        />
        <KpiCard
          icon={<Star className="h-4 w-4 text-amber-400" />}
          title="Stars Impacted"
          accent="border-t-amber-500"
          value={
            dna?.stars_pulled_in
              ? `${(dna.stars_pulled_in / 1000).toFixed(1)}k`
              : profile.repos.length > 0
                ? `${profile.repos.length * 2}k+`
                : "0"
          }
          sub="Combined repo reach"
        />
        <div className="rounded-xl border border-[var(--border-subtle)] glass-panel p-5 shadow-sm border-t-2 border-t-purple-500">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            <Zap className="h-4 w-4 text-purple-400" /> Skill Level
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-[var(--text-primary)] break-words">
            {dna?.skill_level || (profile.merged_count > 0 ? "Active" : "Novice")}
          </div>
          <div className="text-xs text-[var(--text-secondary)] font-sans mt-1">
            {dna?.pr_size_preference || "Standard"} PR scope
          </div>
        </div>
      </div>

      {/* Section 5: Contributor Season & Streak Momentum */}
      {profile.season && !!profile.level && profile.level > 0 && (
        <SectionShell>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-400" /> Contributor Season · {profile.season}
            </h2>
            <Link prefetch={false}
              href="/leaderboard"
              title="View the weekly contributor leaderboard"
              className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 font-mono"
            >
              View Leaderboard →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SeasonStat label="Season Level" value={profile.level} />
            <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
              <div className="text-xs font-mono uppercase text-[var(--text-secondary)]">Season XP</div>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {profile.season_xp ?? 0}
              </div>
            </div>
            <SeasonStat
              label="Weekly Streak"
              value={
                <>
                  {profile.streak_weeks ?? 0}
                  <span className="text-xs font-normal text-[var(--text-secondary)] ml-1">wk</span>
                </>
              }
            />
            <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
              <div className="text-xs font-mono uppercase text-[var(--text-secondary)]">Global Rank</div>
              <div className="text-xl font-bold font-mono text-purple-600 mt-1">
                {typeof profile.season_rank === "number" ? `#${profile.season_rank}` : " - "}
              </div>
            </div>
          </div>
        </SectionShell>
      )}

      {/* Section 6: Ecosystem & Language Proficiency Radar */}
      {languages.length > 0 && (
        <SectionShell>
          <h2 className="text-base font-bold font-sans text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Code2 className="h-4 w-4 text-blue-400" />
            Ecosystem & Language Proficiency
          </h2>
          <div className="space-y-3">
            {languages.slice(0, 6).map(([lang, count]) => {
              const pct = totalLangPRs > 0 ? Math.round((count / totalLangPRs) * 100) : 0;
              return (
                <div key={lang} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                      <LangLogo language={lang} /> {lang}
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {pct}% ({count} PRs)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionShell>
      )}

      {/* Section 8: Contributor Work Rhythm & Temporal Focus */}
      {dna?.temporal && (
        <SectionShell>
          <h2 className="text-base font-bold font-sans text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            Contribution Rhythm & Code Review Dynamics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
            <StatRow
              label="Active Window"
              value={dna.temporal.label}
              sub={<>Peak hour: {dna.temporal.peak_hour_utc}:00 UTC</>}
            />
            <StatRow
              label="Avg PR Scope"
              value={
                <>
                  +{Math.round(dna.avg_additions)} / -{Math.round(dna.avg_deletions)}
                </>
              }
              sub={<>{dna.avg_changed_files.toFixed(1)} files changed avg</>}
            />
            <StatRow
              label="Review Feedback"
              value={dna.review_engagement}
              sub="Maintainer discussion depth"
            />
          </div>
        </SectionShell>
      )}

      {/* Section 9: Verified Pull Request History */}
      {hasEvals && evalFeed.length > 0 && (
        <SectionShell>
          <h2 className="text-base font-bold font-sans text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <GitPullRequest className="h-4 w-4 text-emerald-400" />
            Latest Verified PR Forecasts & Outcomes
          </h2>
          <ul className="divide-y divide-slate-800 font-mono text-xs">
            {evalFeed.map((ev, i) => (
              <li
                key={`${ev.repository_full_name}-${ev.pr_number ?? i}-${i}`}
                className="py-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--text-primary)] font-sans">
                    {ev.repository_full_name}
                    {ev.pr_number ? (
                      <span className="text-[var(--text-secondary)] font-mono"> #{ev.pr_number}</span>
                    ) : null}
                  </span>
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    forecast score: {ev.predicted_score} •{" "}
                    {new Date(ev.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded px-2.5 py-1 text-xs font-bold font-mono ${
                    ev.outcome === "hit"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : ev.outcome === "miss"
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                  }`}
                >
                  {ev.outcome === "hit" ? "MERGED ✓" : ev.outcome === "miss" ? "CLOSED" : "PENDING"}
                </span>
              </li>
            ))}
          </ul>
        </SectionShell>
      )}

      {/* Section 10: Contributor Badges & Endorsements */}
      <SectionShell>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-bold font-sans text-[var(--text-primary)] flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            Earned Contributor Badges ({totalBadges}/3)
          </h2>
        </div>

        {totalBadges === 0 ? (
          <div className="rounded border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-secondary)] font-sans">
            No badges unlocked yet. Merge PRs into S-Tier repos or across multiple languages to earn verified badges.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {hasSTier && (
              <BadgeTile
                icon={
                  <div className="h-9 w-9 rounded bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0 font-bold font-mono text-sm">
                    S
                  </div>
                }
                title="Tier S Merged"
                sub="Strict review acceptance"
              />
            )}

            {hasFastShip && (
              <BadgeTile
                icon={
                  <div className="h-9 w-9 rounded bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 shrink-0 font-bold font-mono text-sm">
                    ⚡
                  </div>
                }
                title="Fast Shipper"
                sub="High accuracy & merge count"
              />
            )}

            {hasPolyglot && (
              <BadgeTile
                icon={
                  <div className="h-9 w-9 rounded bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400 shrink-0 font-bold font-mono text-sm">
                    🌐
                  </div>
                }
                title="Ecosystem Polyglot"
                sub="3+ language PRs"
              />
            )}
          </div>
        )}
      </SectionShell>
    </>
  );
};
