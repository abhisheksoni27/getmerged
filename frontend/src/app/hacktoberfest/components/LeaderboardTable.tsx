"use client";

import Link from "next/link";
import { Trophy, Sparkles, Star } from "lucide-react";
import { LeaderboardRepo } from "./hacktoberfestTypes";
import { TierPill, WelcomingPill } from "./StatusPill";

export function LeaderboardRow({ repo, rank }: { repo: LeaderboardRepo; rank: number }) {
  const [owner, name] = repo.full_name.split("/");
  return (
    <tr className="hover:glass-card/60 transition-colors">
      <td className="py-3.5 px-4 text-center font-bold text-zinc-300">
        #{rank}
      </td>
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/${owner}/${name}`}
            className="hover:text-orange-600 transition-colors font-space text-sm font-bold text-white"
          >
            {repo.full_name}
          </Link>
          {repo.welcome_badge && (
            <WelcomingPill rate={repo.first_timer_success_rate} />
          )}
        </div>
        {repo.description && (
          <div className="text-[11px] font-normal text-zinc-300 font-sans truncate max-w-md mt-0.5">
            {repo.description}
          </div>
        )}
      </td>
      <td className="py-3.5 px-4 text-center">
        <TierPill tier={repo.c_rank_tier} />
      </td>
      <td className="py-3.5 px-4 text-right font-bold text-white">
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          {repo.gfi_quality_score ? `${repo.gfi_quality_score}/100` : "N/A"}
        </span>
      </td>
      <td className="py-3.5 px-4 text-right text-zinc-300">
        {repo.first_timer_success_rate ? `${repo.first_timer_success_rate.toFixed(1)}%` : "0.0%"}
      </td>
      <td className="py-3.5 px-4 text-right text-zinc-300">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
          {repo.stars.toLocaleString()}
        </span>
      </td>
      <td className="py-3.5 px-4 text-center">
        <Link
          href={`/${owner}/${name}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg glass-card hover:bg-zinc-200 text-zinc-200 text-[11px] font-semibold transition-colors"
        >
          <span>View Issues</span>
        </Link>
      </td>
    </tr>
  );
}

export function LeaderboardTable({ repos }: { repos: LeaderboardRepo[] }) {
  return (
    <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-white/[0.1] shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg sm:text-xl font-bold text-white font-space">
              Top Welcoming Repositories
            </h2>
          </div>
          <p className="text-xs text-zinc-300 mt-1">
            Ranked by <strong>C-Rank™ (S/A/B)</strong> and <strong>Good First Issue quality</strong>. Repositories with &gt;60% first-timer merge rates are highlighted with the Welcoming badge.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/[0.1] shadow-xs">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="glass-card text-zinc-200 border-b border-white/[0.1] font-semibold uppercase tracking-wider font-space text-[11px]">
            <tr>
              <th className="py-3.5 px-4 text-center">Rank</th>
              <th className="py-3.5 px-4">Repository</th>
              <th className="py-3.5 px-4 text-center">Tier</th>
              <th className="py-3.5 px-4 text-right">GFI Quality</th>
              <th className="py-3.5 px-4 text-right">First-Timer Rate</th>
              <th className="py-3.5 px-4 text-right">Stars</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-mono">
            {repos.map((repo, idx) => (
              <LeaderboardRow key={repo.id} repo={repo} rank={idx + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
