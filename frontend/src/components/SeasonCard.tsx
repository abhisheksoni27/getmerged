"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { Flame, Zap, Trophy, Share2, Loader2 } from "lucide-react";

interface SeasonStats {
  season: string;
  username?: string;
  total_xp: number;
  season_xp: number;
  weekly_xp: number;
  level: number;
  xp_to_next_level: number;
  streak_weeks: number;
  merged_count: number;
  season_rank: number | null;
  percentile: number | null;
}

interface SeasonResponse {
  season: SeasonStats;
  card_id: string;
  share_url: string;
  og_image_url: string;
}

// Contributor XP season widget (AC3): level/streak surfaced on the dashboard
// with a link to the shareable season-rank card. Hides itself entirely when
// the API fails or the user is signed out - never blocks tracker data.
export function SeasonCard() {
  const [data, setData] = useState<SeasonResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/v1/user/season`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.season) setData(json as SeasonResponse);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border-2 border-brand-dark bg-[#111827] p-5 shadow-sm mb-6 flex items-center gap-2 text-sm text-zinc-400 animate-pulse">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your season…
      </div>
    );
  }
  if (!data) return null;

  const s = data.season;

  async function shareSeason() {
    try {
      const url = `${window.location.origin}${data?.share_url ?? ""}`;
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (typeof nav.share === "function" && window.isSecureContext) {
        await nav.share({
          title: "My GetMerged contributor season",
          text: `Level ${s.level} · ${s.season_xp} XP this season`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      window.alert("Season card link copied to clipboard");
    } catch {
      // Non-fatal: user can still open the card page directly.
    }
  }

  return (
    <div className="rounded-xl border-2 border-brand-dark bg-[#111827] p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-amber-500" /> Contributor Season · {s.season}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={shareSeason}
            data-testid="share-season"
            title="Share your season-rank card"
            className="inline-flex items-center gap-1 rounded-lg bg-[#1e293b] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-zinc-800 cursor-pointer"
          >
            <Share2 className="h-3 w-3" /> Share card
          </button>
          <Link
            href="/leaderboard"
            title="View the weekly contributor leaderboard"
            className="inline-flex items-center rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:border-emerald-500 hover:text-emerald-400"
          >
            Leaderboard →
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border-b border-black bg-[#FDFBF7] px-3 py-2">
          <div className="text-[10px] font-mono uppercase text-zinc-400">Level</div>
          <div className="text-2xl font-extrabold font-mono text-zinc-100">{s.level}</div>
        </div>
        <div className="rounded-lg border-b border-black bg-[#FDFBF7] px-3 py-2">
          <div className="text-[10px] font-mono uppercase text-zinc-400">Season XP</div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400">{s.season_xp}</div>
        </div>
        <div className="rounded-lg border-b border-black bg-[#FDFBF7] px-3 py-2">
          <div className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
            <Flame className="h-3 w-3 text-amber-500" /> Streak
          </div>
          <div className="text-2xl font-extrabold font-mono text-zinc-100">
            {s.streak_weeks}
            <span className="text-xs font-semibold text-zinc-400">wk</span>
          </div>
        </div>
        <div className="rounded-lg border-b border-black bg-[#FDFBF7] px-3 py-2">
          <div className="text-[10px] font-mono uppercase text-zinc-400">This week</div>
          <div className="text-2xl font-extrabold font-mono text-violet-700 flex items-center gap-1">
            <Zap className="h-4 w-4" />
            {s.weekly_xp}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-400 font-mono">
        {s.level > 0 ? (
          <>
            {s.xp_to_next_level > 0 ? (
              <>
                {s.xp_to_next_level} XP to level {s.level + 1} ·{" "}
              </>
            ) : (
              <>Max level reached · </>
            )}
            {s.season_rank ? <>#{s.season_rank} in season</> : <>Unranked</>}
            {typeof s.percentile === "number" && <> · Top {(100 - Math.round(s.percentile)).toFixed(0)}%</>}
          </>
        ) : (
          <>Merge a PR to earn your first 50 XP and start a streak.</>
        )}
      </p>
    </div>
  );
}
