"use client";

import React, { useEffect, useState } from "react";
import { Award, Zap, Copy, Check, Sparkles } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface LevelRank {
  level: number;
  title: string;
  badge_color: string;
  min_points: number;
  max_points: number;
  points_to_next_tier: number;
  percentile: string;
}

interface ContributorKarmaData {
  total_karma: number;
  rank: LevelRank;
  merged_tier_s_count: number;
  merged_tier_a_count: number;
  merged_tier_b_count: number;
  first_timer_bonuses: number;
  streak_months: number;
  streak_multiplier: number;
  top_language_mastered: string;
  reputation_headline: string;
}

interface KarmaProfileBadgeProps {
  username: string;
}

export function KarmaProfileBadge({ username }: KarmaProfileBadgeProps) {
  const [karma, setKarma] = useState<ContributorKarmaData | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    async function fetchKarma() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/u/${encodeURIComponent(username)}/karma`);
        if (res.ok) {
          const json = await res.json();
          setKarma(json);
        }
      } catch {
        // Degrade gracefully
      }
    }
    if (username) {
      fetchKarma();
    }
  }, [username]);

  if (!karma) return null;

  const badgeMarkdown = `[![GetMerged Karma](https://getmerged.abhishekco.de/api/v1/u/${username}/karma.svg)](https://getmerged.abhishekco.de/u/${username})`;

  const handleCopyBadge = () => {
    navigator.clipboard.writeText(badgeMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progressToNext =
    karma.rank.max_points > karma.rank.min_points
      ? Math.min(
          100,
          Math.max(
            5,
            ((karma.total_karma - karma.rank.min_points) /
              (karma.rank.max_points - karma.rank.min_points)) *
              100
          )
        )
      : 100;

  return (
    <div className="rounded-3xl glass-panel border border-emerald-500/30 p-6 sm:p-8 bg-gradient-to-br from-emerald-950/20 via-zinc-950/80 to-zinc-900/60 shadow-xl space-y-6 text-white font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Proof-of-Work Reputation</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-space text-white">
            {karma.reputation_headline}
          </h3>
          <p className="text-xs text-zinc-400">
            Verified open-source contribution karma earned across audited repositories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-3xl font-black font-mono text-emerald-400 flex items-center justify-end gap-1">
              <Zap className="h-5 w-5 fill-emerald-400" />
              {karma.total_karma.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-zinc-400">Verified Karma Pts</div>
          </div>
        </div>
      </div>

      {/* Level Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono text-zinc-400">
          <span>Level {karma.rank.level} · {karma.rank.title}</span>
          <span>{karma.rank.percentile}</span>
        </div>
        <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/[0.08] p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${progressToNext}%` }}
          />
        </div>
        {karma.rank.points_to_next_tier > 0 && (
          <div className="text-[11px] font-mono text-zinc-500 text-right">
            {karma.rank.points_to_next_tier} pts to next rank
          </div>
        )}
      </div>

      {/* Tier Merge Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06] text-center">
          <div className="text-lg font-bold font-mono text-emerald-400">{karma.merged_tier_s_count}</div>
          <div className="text-[10px] font-mono text-zinc-400">Tier S Merges (+100)</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06] text-center">
          <div className="text-lg font-bold font-mono text-blue-400">{karma.merged_tier_a_count}</div>
          <div className="text-[10px] font-mono text-zinc-400">Tier A Merges (+50)</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06] text-center">
          <div className="text-lg font-bold font-mono text-purple-400">{karma.first_timer_bonuses}</div>
          <div className="text-[10px] font-mono text-zinc-400">First-Timer Bonus (+50)</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06] text-center">
          <div className="text-lg font-bold font-mono text-amber-400">{karma.streak_multiplier.toFixed(1)}x</div>
          <div className="text-[10px] font-mono text-zinc-400">Streak Multiplier</div>
        </div>
      </div>

      {/* GitHub README Badge Embed Snippet */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/[0.1] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-zinc-300 flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-emerald-400" /> Embed Karma on GitHub Profile README:
          </span>
          <button
            onClick={handleCopyBadge}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-xs font-mono text-zinc-200 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>
        </div>
        <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.06] text-xs font-mono text-emerald-300 overflow-x-auto select-all">
          {badgeMarkdown}
        </div>
      </div>
    </div>
  );
}
