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
} from "lucide-react";
import { CRankBadge } from "@/components/CRankBadge";
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

interface LeagueClientProps {
  initialRepos: LeagueRepo[];
  monthName: string;
  currentMonth: string;
}

export function LeagueClient({ initialRepos, monthName, currentMonth }: LeagueClientProps) {
  const [selectedLang, setSelectedLang] = useState<string>("all");
  const [copiedShare, setCopiedShare] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [trackingMsg, setTrackingMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-xs font-semibold">
              <Flame className="h-3.5 w-3.5" />
              <span>Active Monthly Sprint</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-space text-zinc-100 tracking-tight leading-tight">
              {monthName}
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-sans">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/[0.08]">
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-500 uppercase">Bronze Milestone</span>
              <span className="text-xs font-mono text-zinc-400">1 Merged PR</span>
            </div>
            <div className="text-lg font-bold font-space text-zinc-100 mt-1">Contributor Debut</div>
            <p className="text-xs text-zinc-400 mt-1">Get your first pull request merged into any indexed repository.</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase">Silver Milestone</span>
              <span className="text-xs font-mono text-zinc-400">3 Merged PRs</span>
            </div>
            <div className="text-lg font-bold font-space text-zinc-100 mt-1">Active Builder</div>
            <p className="text-xs text-zinc-400 mt-1">Deliver 3 quality pull requests across active open-source codebases.</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Gold Milestone</span>
              <span className="text-xs font-mono text-zinc-400">5+ Merged PRs</span>
            </div>
            <div className="text-lg font-bold font-space text-zinc-100 mt-1">Monthly Champion</div>
            <p className="text-xs text-zinc-400 mt-1">Top-tier contributor status with verified Gold badge on your profile.</p>
          </div>
        </div>
      </div>

      {/* Live PR Quick-Tracker Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <GitPullRequest className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-bold font-space text-zinc-100">
            Track PR for {monthName}
          </h2>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Paste any public GitHub PR link to count it toward your monthly contributor sprint goal.
        </p>

        <form onSubmit={handleTrackPR} className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="https://github.com/facebook/react/pull/12345"
            required
            className="flex-1 rounded-xl bg-zinc-900/90 border border-white/[0.08] px-4 py-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-white/[0.2]"
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

      {/* Language Filter Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold font-space text-zinc-100 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            Top Welcoming Repositories This Month
          </h2>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
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
                : "bg-white/[0.04] text-zinc-400 hover:text-white"
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
                  : "bg-white/[0.04] text-zinc-400 hover:text-white"
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
                  <span className="font-mono text-xs text-zinc-500 font-bold">#{idx + 1}</span>
                  <Link
                    href={`/${repo.full_name}`}
                    title={`View ${repo.full_name} scorecard`}
                    className="font-space font-bold text-sm text-zinc-100 hover:text-orange-400 transition-colors truncate"
                  >
                    {repo.full_name}
                  </Link>
                </div>
                <CRankBadge rank={repo.c_rank_tier || "A"} size="sm" />
              </div>

              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                {repo.description || "Active open-source repository indexed by GetMerged."}
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-white/[0.06]">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="glass-card p-2 rounded-lg">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Stars</div>
                  <div className="text-xs font-mono font-bold text-zinc-200 mt-0.5">
                    {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
                  </div>
                </div>
                <div className="glass-card p-2 rounded-lg">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">1st-Timer</div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                    {repo.first_timer_success_rate ? `${Math.round(repo.first_timer_success_rate)}%` : "—"}
                  </div>
                </div>
                <div className="glass-card p-2 rounded-lg">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Issues</div>
                  <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                    {repo.gfi_count || "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-zinc-400">
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
    </div>
  );
}
