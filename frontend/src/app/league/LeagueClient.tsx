"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  ExternalLink,
  Flame,
  Share2,
  Plus,
  GitPullRequest,
  Check,
  Award,
  Clock,
  Users,
} from "lucide-react";
import { CRankBadge } from "@/components/CRankBadge";
import { ContributorWrappedModal } from "@/components/ContributorWrappedModal";
import { API_BASE_URL } from "@/lib/api";

export interface LeagueRepo {
  id: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stars: number;
  c_rank_tier: string;
  c_rank_score: number;
  gfi_count: number;
  first_timer_success_rate: number;
}

export interface ContributorMVP {
  rank: number;
  username: string;
  slug: string;
  avatar_url: string;
  merged_count: number;
  monthly_points: number;
  level: string;
  primary_lang: string;
}

interface LeagueClientProps {
  initialRepos: LeagueRepo[];
  contributors?: ContributorMVP[];
  monthName: string;
  currentMonth: string;
}

export function LeagueClient({ initialRepos, contributors = [], monthName, currentMonth }: LeagueClientProps) {
  const [selectedLang, setSelectedLang] = useState<string>("all");
  const [copiedShare, setCopiedShare] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [trackingMsg, setTrackingMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"repos" | "mvps">("repos");
  const [wrappedUser, setWrappedUser] = useState<ContributorMVP | null>(null);

  // Calculate days remaining dynamically
  const daysRemaining = useMemo(() => {
    const [y, m] = currentMonth.split("-");
    const end = new Date(parseInt(y), parseInt(m), 1);
    const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [currentMonth]);

  const languages = useMemo(() => {
    const set = new Set<string>();
    initialRepos.forEach((r) => {
      if (r.language) set.add(r.language);
    });
    return Array.from(set).sort();
  }, [initialRepos]);

  const filteredRepos = useMemo(() => {
    if (selectedLang === "all") return initialRepos;
    return initialRepos.filter((r) => r.language === selectedLang);
  }, [initialRepos, selectedLang]);

  const handleShare = () => {
    const text = `Join the ${monthName} (${currentMonth}) on GetMerged! Rank up on welcoming open-source repositories and earn verified Proof-of-Merge badges: https://getmerged.abhishekco.de/league`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleTrackPR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prUrl.trim()) return;
    setTrackingLoading(true);
    setTrackingMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/prs/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pr_url: prUrl.trim() }),
      });

      if (res.status === 401) {
        setTrackingMsg({ text: "Please sign in with GitHub to track PRs toward your monthly sprint.", type: "error" });
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTrackingMsg({ text: err.error || "Failed to track pull request.", type: "error" });
        return;
      }

      setTrackingMsg({ text: "PR tracked successfully! It will count toward your monthly sprint badge.", type: "success" });
      setPrUrl("");
    } catch {
      setTrackingMsg({ text: "Network error tracking PR.", type: "error" });
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 font-sans">
      {/* Hero Sprint Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-xs font-semibold">
                <Flame className="h-3.5 w-3.5" />
                <span>Active Monthly Sprint</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-card border border-white/[0.1] text-zinc-300 font-mono text-xs">
                <Clock className="h-3.5 w-3.5 text-zinc-300" />
                <span>{daysRemaining} Days Remaining</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black font-space text-white tracking-tight leading-tight">
              {monthName}
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-sans">
              Merge pull requests into top-ranked, welcoming open-source repositories this month. Level up from Bronze to Gold and earn verified Proof-of-Merge resume badges.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl glass-card hover:bg-white/[0.08] text-xs font-mono font-bold text-zinc-200 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              <Share2 className="h-4 w-4 text-orange-400" />
              <span>{copiedShare ? "Copied Share Link!" : "Share Sprint League"}</span>
            </button>
          </div>
        </div>

        {/* Milestone Targets Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/[0.1]">
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-500 uppercase">Bronze Milestone</span>
              <span className="text-xs font-mono text-zinc-300">1 Merged PR</span>
            </div>
            <div className="text-lg font-bold font-space text-white mt-1">Contributor Debut</div>
            <p className="text-xs text-zinc-300 mt-1">Get your first pull request merged into any indexed repository.</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase">Silver Milestone</span>
              <span className="text-xs font-mono text-zinc-300">3 Merged PRs</span>
            </div>
            <div className="text-lg font-bold font-space text-white mt-1">Active Builder</div>
            <p className="text-xs text-zinc-300 mt-1">Deliver 3 quality pull requests across active open-source codebases.</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Gold Milestone</span>
              <span className="text-xs font-mono text-zinc-300">5+ Merged PRs</span>
            </div>
            <div className="text-lg font-bold font-space text-white mt-1">Monthly Champion</div>
            <p className="text-xs text-zinc-300 mt-1">Top-tier contributor status with verified Gold badge on your profile.</p>
          </div>
        </div>
      </div>

      {/* Live PR Quick-Tracker Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <GitPullRequest className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-bold font-space text-white">
            Track PR for {monthName}
          </h2>
        </div>
        <p className="text-xs text-zinc-300 mb-4">
          Paste any public GitHub PR link to count it toward your monthly contributor sprint goal.
        </p>

        <form onSubmit={handleTrackPR} className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="https://github.com/facebook/react/pull/12345"
            required
            className="flex-1 rounded-xl glass-panel border border-white/[0.1] px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-300 focus:outline-none focus:border-white/[0.2]"
          />
          <button
            type="submit"
            disabled={trackingLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-6 py-3 text-xs font-mono font-bold text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{trackingLoading ? "Tracking..." : "Track PR"}</span>
          </button>
        </form>

        {trackingMsg && (
          <div
            className={`mt-3 text-xs font-mono p-3 rounded-lg flex items-center gap-2 ${
              trackingMsg.type === "success"
                ? "bg-emerald-950/40 border border-emerald-500/20 text-emerald-400"
                : "bg-rose-950/40 border border-rose-500/20 text-rose-400"
            }`}
          >
            {trackingMsg.type === "success" ? <Check className="h-4 w-4" /> : null}
            <span>{trackingMsg.text}</span>
          </div>
        )}
      </div>

      {/* Dual Tab Navigation (Welcoming Repos vs Contributor MVPs) */}
      <div className="flex items-center gap-3 border-b border-white/[0.1] pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("repos")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
            activeTab === "repos"
              ? "bg-white text-zinc-950 shadow-sm"
              : "glass-card text-zinc-300 hover:text-white"
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>Welcoming Repositories</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("mvps")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
            activeTab === "mvps"
              ? "bg-white text-zinc-950 shadow-sm"
              : "glass-card text-zinc-300 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Top Contributor MVPs</span>
          {contributors.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px]">
              {contributors.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "repos" ? (
        <>
          {/* Language Filter Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap pb-2">
            <div>
              <h2 className="text-xl font-bold font-space text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                Ranked Repositories for {monthName}
              </h2>
              <p className="text-xs text-zinc-300 font-sans mt-0.5">
                Ranked by PR merge acceptance velocity, first-timer hospitality, and open issues.
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              <button
                type="button"
                onClick={() => setSelectedLang("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  selectedLang === "all"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "bg-white/[0.04] text-zinc-300 hover:text-white"
                }`}
              >
                All Languages
              </button>
              {languages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLang(lang)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    selectedLang === lang
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "bg-white/[0.04] text-zinc-300 hover:text-white"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Repos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRepos.map((repo, idx) => (
              <div
                key={repo.id}
                className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:border-white/[0.16] transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-zinc-300 font-bold">#{idx + 1}</span>
                      <Link
                        href={`/${repo.full_name}`}
                        title={`View ${repo.full_name} scorecard`}
                        className="font-space font-bold text-sm text-white hover:text-orange-400 transition-colors truncate"
                      >
                        {repo.full_name}
                      </Link>
                    </div>
                    <CRankBadge rank={repo.c_rank_tier || "A"} size="sm" />
                  </div>

                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed mb-4">
                    {repo.description || "Active open-source repository indexed by GetMerged."}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/[0.09]">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="glass-card p-2 rounded-lg">
                      <div className="text-[10px] font-mono text-zinc-300 uppercase">Stars</div>
                      <div className="text-xs font-mono font-bold text-zinc-200 mt-0.5">
                        {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
                      </div>
                    </div>
                    <div className="glass-card p-2 rounded-lg">
                      <div className="text-[10px] font-mono text-zinc-300 uppercase">1st-Timer</div>
                      <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                        {repo.first_timer_success_rate ? `${Math.round(repo.first_timer_success_rate)}%` : " - "}
                      </div>
                    </div>
                    <div className="glass-card p-2 rounded-lg">
                      <div className="text-[10px] font-mono text-zinc-300 uppercase">Issues</div>
                      <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                        {repo.gfi_count || " - "}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono text-zinc-300">
                      {repo.language || "Code"}
                    </span>
                    <Link
                      href={`/${repo.full_name}`}
                      title={`View ${repo.full_name} live metrics`}
                      className="inline-flex items-center gap-1 text-xs font-mono font-bold text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <span>Scorecard</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Contributor MVPs Section */
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold font-space text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-400" />
              Top Contributor MVPs for {monthName}
            </h2>
            <p className="text-xs text-zinc-300 font-sans mt-0.5">
              Ranked by verified quality pull request points merged into C-Rank scored repositories.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contributors.map((c) => (
              <div key={c.username} className="glass-panel p-5 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.avatar_url}
                      alt={c.username}
                      className="w-12 h-12 rounded-xl border border-white/[0.1] object-cover glass-card"
                    />
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full glass-card border border-white/[0.12] flex items-center justify-center font-mono text-[10px] font-bold text-zinc-200">
                      #{c.rank}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/u/${c.slug}`}
                      title={`View ${c.username} profile`}
                      className="font-space font-bold text-sm text-white hover:text-orange-400 transition-colors truncate block"
                    >
                      @{c.username}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5 text-xs font-mono text-zinc-300">
                      <span>{c.merged_count} PRs</span>
                      <span>•</span>
                      <span className="text-amber-400">{c.monthly_points} pts</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWrappedUser(c)}
                    title="Share Contributor Wrapped Card"
                    className="p-2 rounded-xl glass-card hover:bg-amber-500/20 text-zinc-400 hover:text-amber-400 border border-white/[0.08] hover:border-amber-500/30 transition-all cursor-pointer"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                    c.level === "Gold" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" :
                    c.level === "Silver" ? "bg-zinc-500/10 border border-zinc-500/20 text-zinc-300" :
                    "bg-orange-500/10 border border-orange-500/20 text-orange-400"
                  }`}>
                    {c.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contributor Wrapped Modal */}
      {wrappedUser && (
        <ContributorWrappedModal
          username={wrappedUser.username}
          avatarUrl={wrappedUser.avatar_url}
          rank={wrappedUser.rank}
          karma={wrappedUser.monthly_points}
          mergedCount={wrappedUser.merged_count}
          monthName={monthName}
          topLang={wrappedUser.primary_lang}
          percentile={wrappedUser.rank <= 3 ? "Top 1%" : "Top 5%"}
          isOpen={!!wrappedUser}
          onClose={() => setWrappedUser(null)}
        />
      )}
    </div>
  );
}
