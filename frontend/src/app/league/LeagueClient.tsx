"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  ExternalLink,
  Flame,
  Share2,
} from "lucide-react";
import { CRankBadge } from "@/components/CRankBadge";

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
}

export function LeagueClient({ initialRepos, monthName }: LeagueClientProps) {
  const [selectedLang, setSelectedLang] = useState<string>("all");
  const [copiedShare, setCopiedShare] = useState(false);

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
    const text = `Join the ${monthName} on GetMerged! Rank up on welcoming open-source repositories and earn verified Proof-of-Merge badges: https://getmerged.abhishekco.de/league`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
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
