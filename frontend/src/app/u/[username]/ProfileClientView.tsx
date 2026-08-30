"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import type { User } from "@/types/opendoor";
import type { PublicProfile } from "@/lib/public-profile";
import { ProjectCard } from "@/components/ProjectCard";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import OpenToOpportunitiesToggle from "@/components/OpenToOpportunitiesToggle";
import ShareCardButton from "@/components/ShareCardButton";
import { CRankBadge } from "@/components/CRankBadge";
import { CopyBadgeButton } from "@/components/CopyBadgeButton";
import { KarmaProfileBadge, type ContributorKarmaData } from "@/components/KarmaProfileBadge";
import { EmbedKarmaBadgeCard } from "@/components/EmbedKarmaBadgeCard";
import { ProofOfWorkResumeModal } from "@/components/ProofOfWorkResumeModal";
import { RecruiterContactSection } from "@/components/RecruiterContactSection";
import { LangLogo } from "@/components/LangLogo";
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
  Award,
  Edit3,
  Pin,
  FolderGit2,
  FileText,
  LogOut,
} from "lucide-react";

interface ProfileClientViewProps {
  initialProfile: PublicProfile;
  initialKarma?: ContributorKarmaData | null;
}

export const ProfileClientView: React.FC<ProfileClientViewProps> = ({
  initialProfile,
  initialKarma = null,
}) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PublicProfile>(initialProfile);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Is the current viewer the owner of this profile?
  const isOwner =
    !!currentUser &&
    (currentUser.slug?.toLowerCase() === profile.slug.toLowerCase() ||
      currentUser.username?.toLowerCase() === profile.username.toLowerCase());

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Clear cookie client-side as fallback
      document.cookie = "opendoor_token=; Path=/; Max-Age=0; SameSite=Lax";
    }
    setCurrentUser(null);
    window.location.href = "/";
  };

  const hasEvals = profile.total_evals > 0;
  const accuracyPct =
    profile.accuracy_rate !== null && profile.accuracy_n > 0
      ? Math.round(profile.accuracy_rate * 100)
      : null;
  const evalFeed = profile.evals ?? [];
  const dna = profile.dna;

  // Language breakdown computation - sorted descending by number of contributions/PRs
  const languages = dna?.language_breakdown
    ? Object.entries(dna.language_breakdown).sort((a, b) => b[1] - a[1])
    : [];
  const totalLangPRs = languages.reduce((acc, [, count]) => acc + count, 0);

  // Markdown badge string for one-click embed
  const badgeMarkdown = `[![GetMerged Verified Contributor](https://getmerged.abhishekco.de/api/badge/u/${profile.slug})](https://getmerged.abhishekco.de/u/${profile.slug})`;

  const showcaseProjects = profile.showcase_projects || [];
  const publicRepos = profile.public_repos || [];

  return (
    <>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-10">
        {/* Section 1: Executive Contributor Header */}
        <div className="mb-8 rounded-xl glass-panel p-6 sm:p-8 border border-white/[0.1] border-t-2 border-t-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-5 flex-1 min-w-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl border border-white/[0.12] bg-slate-800 shadow-md object-cover shrink-0"
                />
              ) : (
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-slate-800 text-white flex items-center justify-center font-sans font-bold text-2xl shrink-0 border border-white/[0.12]">
                  {profile.username.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold font-sans text-white truncate">
                    {profile.username}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-800 text-zinc-300 text-xs font-mono border border-white/[0.12]">
                    @{profile.slug}
                  </span>
                  {dna?.persona && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 text-xs font-mono font-bold border border-emerald-700/80">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                      {dna.persona}
                    </span>
                  )}
                </div>

                {/* Professional Headline */}
                {profile.headline ? (
                  <p className="text-sm font-medium text-amber-300/90 font-sans mt-1.5 leading-snug">
                    {profile.headline}
                  </p>
                ) : null}

                <p className="text-xs font-mono text-zinc-400 flex items-center gap-1.5 mt-2">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  Verified on GetMerged since{" "}
                  {new Date(profile.member_since).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                  })}
                </p>

                {/* Bio / About */}
                {profile.bio ? (
                  <p className="mt-3 text-sm text-zinc-200 leading-relaxed font-sans whitespace-pre-line">
                    {profile.bio}
                  </p>
                ) : isOwner ? (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="mt-3 text-xs font-mono text-zinc-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3 text-amber-400" /> Add your bio...
                  </button>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2.5 self-start md:self-auto flex-wrap">
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-3.5 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 hover:text-white border border-white/[0.12] text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Log out of GetMerged"
                    className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5 text-rose-400" />
                    <span>Log Out</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsResumeModalOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export Resume</span>
              </button>
              <ShareCardButton slug={profile.slug} username={profile.username} />
            </div>
          </div>
        </div>

        {/* Talent Pass Toggle */}
        <OpenToOpportunitiesToggle slug={profile.slug} />

        {/* Proof-of-Work Karma & Reputation Section */}
        <div className="mb-8 space-y-6">
          <KarmaProfileBadge
            username={profile.slug || profile.username}
            initialKarma={initialKarma}
          />
          <EmbedKarmaBadgeCard
            username={profile.slug || profile.username}
            karma={initialKarma?.total_karma}
            levelTitle={initialKarma?.rank?.title}
            badgeColor={initialKarma?.rank?.badge_color}
          />
        </div>

        {/* Section 2: Featured Showcase Projects (Private & Public Work with Photos) */}
        {showcaseProjects.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-bold font-sans text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Featured Project Showcases ({showcaseProjects.length})
              </h2>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs font-mono text-amber-400 hover:text-amber-300"
                >
                  Manage Showcases →
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showcaseProjects.map((proj) => (
                <ProjectCard key={proj.id} project={proj} />
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Auto-Imported Public Repositories (Sorted by Stars) */}
        {publicRepos.length > 0 && (
          <div className="mb-8 rounded-xl glass-panel p-6 border border-white/[0.1] shadow-sm border-t-2 border-t-slate-700">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold font-sans text-white flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-blue-400" />
                  Top Public Repositories ({publicRepos.length})
                </h2>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">
                  Auto-imported from GitHub and ranked by community stars.
                </p>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs font-mono text-amber-400 hover:text-amber-300"
                >
                  Pin Repos →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {publicRepos.map((repo) => (
                <a
                  key={repo.full_name}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-xl border border-white/[0.08] bg-[#141414]/90 hover:bg-[#1a1a1a] hover:border-white/[0.18] transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono font-bold text-sm text-white group-hover:text-amber-400 transition-colors truncate">
                        {repo.name || repo.full_name}
                      </span>
                      {repo.is_pinned && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 text-[10px] font-mono border border-amber-800/60 shrink-0">
                          <Pin className="h-2.5 w-2.5" /> Pinned
                        </span>
                      )}
                    </div>
                    {repo.description ? (
                      <p className="text-xs text-zinc-400 font-sans line-clamp-2 mt-1.5 leading-relaxed">
                        {repo.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-white/[0.04] text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      {repo.language && <LangLogo language={repo.language} />}
                      <span>{repo.language || "Code"}</span>
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {repo.stars.toLocaleString()}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Core Telemetry KPI Quad (2x2 Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-white/[0.1] glass-panel p-5 shadow-sm border-t-2 border-t-emerald-500">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
              <Merge className="h-4 w-4 text-emerald-400" /> Merged PRs
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-white">
              {dna?.total_merged_prs ?? profile.merged_count}
            </div>
            <div className="text-xs text-zinc-400 font-sans mt-1">Verified public merges</div>
          </div>

          <div className="rounded-xl border border-white/[0.1] glass-panel p-5 shadow-sm border-t-2 border-t-blue-500">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
              <Target className="h-4 w-4 text-blue-400" /> Accuracy
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-white">
              {accuracyPct !== null ? `${accuracyPct}%` : " - "}
            </div>
            <div className="text-xs text-zinc-400 font-sans mt-1">Over settled PR evals</div>
          </div>

          <div className="rounded-xl border border-white/[0.1] glass-panel p-5 shadow-sm border-t-2 border-t-amber-500">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
              <Star className="h-4 w-4 text-amber-400" /> Stars Impacted
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-white">
              {dna?.stars_pulled_in
                ? `${(dna.stars_pulled_in / 1000).toFixed(1)}k`
                : profile.repos.length > 0
                ? `${profile.repos.length * 2}k+`
                : "0"}
            </div>
            <div className="text-xs text-zinc-400 font-sans mt-1">Combined repo reach</div>
          </div>

          <div className="rounded-xl border border-white/[0.1] glass-panel p-5 shadow-sm border-t-2 border-t-purple-500">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
              <Zap className="h-4 w-4 text-purple-400" /> Skill Level
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-white break-words">
              {dna?.skill_level || (profile.merged_count > 0 ? "Active" : "Novice")}
            </div>
            <div className="text-xs text-zinc-400 font-sans mt-1">
              {dna?.pr_size_preference || "Standard"} PR scope
            </div>
          </div>
        </div>

        {/* Section 5: Contributor Season & Streak Momentum */}
        {profile.season && !!profile.level && profile.level > 0 && (
          <div className="mb-8 rounded-md glass-panel p-6 border border-white/[0.1] shadow-sm border-t-2 border-t-slate-700">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-400" /> Contributor Season · {profile.season}
              </h2>
              <Link
                href="/leaderboard"
                title="View the weekly contributor leaderboard"
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 font-mono"
              >
                View Leaderboard →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded border border-white/[0.12] bg-slate-800/80 px-4 py-3">
                <div className="text-xs font-mono uppercase text-zinc-300">Season Level</div>
                <div className="text-xl font-bold font-mono text-white mt-1">{profile.level}</div>
              </div>
              <div className="rounded border border-white/[0.12] bg-slate-800/80 px-4 py-3">
                <div className="text-xs font-mono uppercase text-zinc-300">Season XP</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {profile.season_xp ?? 0}
                </div>
              </div>
              <div className="rounded border border-white/[0.12] bg-slate-800/80 px-4 py-3">
                <div className="text-xs font-mono uppercase text-zinc-300">Weekly Streak</div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {profile.streak_weeks ?? 0}
                  <span className="text-xs font-normal text-zinc-300 ml-1">wk</span>
                </div>
              </div>
              <div className="rounded border border-white/[0.12] bg-slate-800/80 px-4 py-3">
                <div className="text-xs font-mono uppercase text-zinc-300">Global Rank</div>
                <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                  {typeof profile.season_rank === "number" ? `#${profile.season_rank}` : " - "}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Ecosystem & Language Proficiency Radar */}
        {languages.length > 0 && (
          <div className="mb-8 rounded-md glass-panel p-6 border border-white/[0.1] shadow-sm border-t-2 border-t-slate-700">
            <h2 className="text-base font-bold font-sans text-white mb-4 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-blue-400" />
              Ecosystem & Language Proficiency
            </h2>
            <div className="space-y-3">
              {languages.slice(0, 6).map(([lang, count]) => {
                const pct = totalLangPRs > 0 ? Math.round((count / totalLangPRs) * 100) : 0;
                return (
                  <div key={lang} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-2 font-bold text-zinc-200">
                        <LangLogo language={lang} /> {lang}
                      </span>
                      <span className="text-zinc-400">
                        {pct}% ({count} PRs)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 7: Elite Repositories Merged Into */}
        <div className="mb-8 rounded-md glass-panel p-6 border border-white/[0.1] shadow-sm border-t-2 border-t-slate-700">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-bold font-sans text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Verified Repository Merges ({profile.repos.length})
            </h2>
            <span className="text-xs font-mono text-zinc-400">Ranked by C-Rank™ Tier</span>
          </div>

          {profile.repos.length === 0 ? (
            <div className="rounded border border-dashed border-white/[0.1] p-8 text-center text-xs text-zinc-400 font-sans">
              No merged repository records logged yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.repos.map((repo) => (
                <div
                  key={repo.full_name}
                  className="flex items-center justify-between gap-3 rounded border border-white/[0.1] bg-slate-800/60 p-3.5 hover:bg-slate-800 hover:border-white/[0.12] transition-colors"
                >
                  <Link
                    href={`/${repo.full_name}`}
                    title={`View ${repo.full_name} scorecard and merge metrics`}
                    className="truncate text-sm font-semibold font-sans text-zinc-200 hover:text-orange-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{repo.full_name}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  </Link>
                  <div className="shrink-0">
                    <CRankBadge rank={repo.c_rank_tier} size="sm" showLabel={false} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 8: Contributor Work Rhythm & Temporal Focus */}
        {dna?.temporal && (
          <div className="mb-8 rounded-md glass-panel p-6 border border-white/[0.1] shadow-sm border-t-2 border-t-slate-700">
            <h2 className="text-base font-bold font-sans text-white mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Contribution Rhythm & Code Review Dynamics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
              <div className="p-4 rounded border border-white/[0.1] bg-slate-800/80">
                <div className="text-xs font-mono text-zinc-400 font-bold uppercase">Active Window</div>
                <div className="text-base font-bold text-white mt-1">{dna.temporal.label}</div>
                <div className="text-xs text-zinc-400 mt-1">
                  Peak hour: {dna.temporal.peak_hour_utc}:00 UTC
                </div>
              </div>
              <div className="p-4 rounded border border-white/[0.1] bg-slate-800/80">
                <div className="text-xs font-mono text-zinc-400 font-bold uppercase">Avg PR Scope</div>
                <div className="text-base font-bold text-white mt-1">
                  +{Math.round(dna.avg_additions)} / -{Math.round(dna.avg_deletions)}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  {dna.avg_changed_files.toFixed(1)} files changed avg
                </div>
              </div>
              <div className="p-4 rounded border border-white/[0.1] bg-slate-800/80">
                <div className="text-xs font-mono text-zinc-400 font-bold uppercase">Review Feedback</div>
                <div className="text-base font-bold text-white mt-1">{dna.review_engagement}</div>
                <div className="text-xs text-zinc-400 mt-1">Maintainer discussion depth</div>
              </div>
            </div>
          </div>
        )}

        {/* Section 9: Verified Pull Request History */}
        {hasEvals && evalFeed.length > 0 && (
          <div className="mb-8 rounded-md glass-panel p-6 border border-white/[0.1] shadow-sm border-t-2 border-t-slate-700">
            <h2 className="text-base font-bold font-sans text-white mb-4 flex items-center gap-2">
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
                    <span className="block truncate text-sm font-semibold text-white font-sans">
                      {ev.repository_full_name}
                      {ev.pr_number ? (
                        <span className="text-zinc-400 font-mono"> #{ev.pr_number}</span>
                      ) : null}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
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
                        : "bg-slate-800 text-zinc-300 border border-white/[0.12]"
                    }`}
                  >
                    {ev.outcome === "hit" ? "MERGED ✓" : ev.outcome === "miss" ? "CLOSED" : "PENDING"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Section 10: Contributor Badges & Endorsements */}
        {(() => {
          const hasSTier = profile.repos.some((r) => r.c_rank_tier === "S");
          const hasFastShip = profile.merged_count >= 5 || (accuracyPct !== null && accuracyPct >= 80);
          const hasPolyglot = languages.length >= 3;
          const totalBadges = [hasSTier, hasFastShip, hasPolyglot].filter(Boolean).length;

          return (
            <div className="mb-8 rounded-md glass-panel p-6 border border-white/[0.1] shadow-sm border-t-2 border-t-slate-700">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-bold font-sans text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-400" />
                  Earned Contributor Badges ({totalBadges}/3)
                </h2>
              </div>

              {totalBadges === 0 ? (
                <div className="rounded border border-dashed border-white/[0.1] p-6 text-center text-xs text-zinc-400 font-sans">
                  No badges unlocked yet. Merge PRs into S-Tier repos or across multiple languages to earn verified badges.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {hasSTier && (
                    <div className="p-3.5 rounded border border-white/[0.1] bg-slate-800/80 flex items-center gap-3">
                      <div className="h-9 w-9 rounded bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0 font-bold font-mono text-sm">
                        S
                      </div>
                      <div>
                        <div className="font-sans font-bold text-sm text-white">Tier S Merged</div>
                        <div className="text-xs text-zinc-400 font-sans">Strict review acceptance</div>
                      </div>
                    </div>
                  )}

                  {hasFastShip && (
                    <div className="p-3.5 rounded border border-white/[0.1] bg-slate-800/80 flex items-center gap-3">
                      <div className="h-9 w-9 rounded bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 shrink-0 font-bold font-mono text-sm">
                        ⚡
                      </div>
                      <div>
                        <div className="font-sans font-bold text-sm text-white">Fast Shipper</div>
                        <div className="text-xs text-zinc-400 font-sans">High accuracy & merge count</div>
                      </div>
                    </div>
                  )}

                  {hasPolyglot && (
                    <div className="p-3.5 rounded border border-white/[0.1] bg-slate-800/80 flex items-center gap-3">
                      <div className="h-9 w-9 rounded bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400 shrink-0 font-bold font-mono text-sm">
                        🌐
                      </div>
                      <div>
                        <div className="font-sans font-bold text-sm text-white">Ecosystem Polyglot</div>
                        <div className="text-xs text-zinc-400 font-sans">3+ language PRs</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Section 11: Embeddable Resume Markdown Badge */}
        <div className="mb-8 rounded-md glass-panel p-6 border border-white/[0.1] shadow-sm border-t-2 border-t-slate-700">
          <h2 className="text-base font-bold font-sans text-white mb-2 flex items-center gap-2">
            <Copy className="h-4 w-4 text-zinc-400" />
            Embed on GitHub README or Resume
          </h2>
          <p className="text-xs text-zinc-400 font-sans mb-3">
            Copy the markdown badge below to showcase your verified GetMerged contributor score directly in your GitHub profile README.
          </p>
          <div className="flex items-center gap-3 bg-black/80 border border-white/[0.1] text-zinc-200 p-3 sm:p-4 rounded-xl font-mono text-xs overflow-hidden">
            <code className="flex-1 overflow-x-auto whitespace-nowrap text-amber-400 scrollbar-none py-1">
              {badgeMarkdown}
            </code>
            <CopyBadgeButton text={badgeMarkdown} />
          </div>
        </div>

        {/* Section 12: Recruiter & Opportunities Direct Signal on GetMerged */}
        <RecruiterContactSection username={profile.username} slug={profile.slug} />
      </main>

      {/* Edit Profile Modal */}
      {isOwner && (
        <ProfileEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onProfileUpdated={(updated) => {
            if (updated) {
              setProfile((prev) => ({ ...prev, ...updated }));
            }
            router.refresh();
          }}
        />
      )}

      {/* Proof of Work Resume Modal */}
      <ProofOfWorkResumeModal
        profile={profile}
        karma={initialKarma}
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
      />
    </>
  );
};
