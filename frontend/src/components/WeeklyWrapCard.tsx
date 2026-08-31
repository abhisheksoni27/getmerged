"use client";

import React, { useState } from "react";
import {
  Mail,
  Sparkles,
  Flame,
  Zap,
  Eye,
  X,
  Trophy,
} from "lucide-react";

interface WeeklyWrapCardProps {
  isSubscribed?: boolean;
  onToggle?: (enabled: boolean) => void;
  busy?: boolean;
}

export function WeeklyWrapCard({
  isSubscribed = true,
  onToggle,
  busy = false,
}: WeeklyWrapCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [userStats, setUserStats] = useState<{
    username: string;
    total_karma: number;
    streak_weeks: number;
    level_title: string;
    primary_language: string;
  } | null>(null);

  React.useEffect(() => {
    fetch("/api/v1/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUserStats({
            username: data.user.username || "Contributor",
            total_karma: data.user.karma_score || 0,
            streak_weeks: data.user.streak_weeks || 1,
            level_title: data.user.level_title || "Verified Contributor",
            primary_language: data.user.primary_language || "TypeScript",
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="rounded-3xl glass-panel border border-emerald-500/20 bg-[#121215] p-6 sm:p-7 space-y-5 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono mb-1 font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Sunday 6:00 PM Dispatch</span>
            </div>
            <h3 className="text-lg font-bold font-space text-white">
              Weekly Contributor Wrap
            </h3>
            <p className="text-xs text-zinc-300 font-sans mt-0.5 max-w-md">
              A high-retention Sunday recap of your weekly streak, earned Karma points, PR review turnaround times, and 3 curated Good First Issues in your tech stack.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/[0.2] text-xs font-mono transition-all cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview Wrap</span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => onToggle?.(!isSubscribed)}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
              isSubscribed
                ? "bg-emerald-600/20 border border-emerald-500/40 text-emerald-400"
                : "glass-card text-zinc-400 border border-white/[0.08]"
            }`}
          >
            {isSubscribed ? "Subscribed ✓" : "Enable"}
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="p-3 rounded-xl bg-[#09090b] border border-white/[0.06] space-y-1">
          <div className="text-amber-400 font-mono text-xs font-bold flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            <span>Streak &amp; Momentum</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            Track weekly XP deltas, reputation level title, and active merge streaks.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#09090b] border border-white/[0.06] space-y-1">
          <div className="text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            <span>Curated Issue Drop</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            Top 3 verified beginner issues matching your primary programming languages.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#09090b] border border-white/[0.06] space-y-1">
          <div className="text-violet-400 font-mono text-xs font-bold flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            <span>Repo Spotlight</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            High-turnaround Tier-S repos actively merging first-time external PRs.
          </p>
        </div>
      </div>

      {/* Interactive Wrap Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto font-sans">
          <div className="relative w-full max-w-lg rounded-3xl glass-panel border border-emerald-500/30 bg-[#101012] p-6 sm:p-7 space-y-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="absolute right-5 top-5 p-2 rounded-full glass-card text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                Email Preview
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Subject: 🔥 3-Wk Streak · +150 Karma &amp; Your Weekly Contributor Wrap
              </span>
            </div>

            {/* Email Container Mockup */}
            <div className="p-5 rounded-2xl bg-[#08080a] border border-white/[0.08] space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="font-bold font-space text-white text-sm">
                  ⚡ GetMerged <span className="text-zinc-400 font-normal">Weekly Wrap</span>
                </span>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Verified Proof
                </span>
              </div>

              {/* Momentum Card */}
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <div className="text-[10px] font-mono text-emerald-300 font-bold uppercase">
                  Your Contributor Momentum
                </div>
                <div className="text-sm font-bold text-white">
                  Welcome back, <span className="text-emerald-400">@{userStats?.username || "Contributor"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                  <div className="p-2 rounded bg-black/40 border border-white/[0.06]">
                    <div className="text-zinc-400">Streak</div>
                    <div className="text-amber-400 font-bold text-xs mt-0.5">🔥 {userStats?.streak_weeks || 1} Wks</div>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/[0.06]">
                    <div className="text-zinc-400">Stack</div>
                    <div className="text-white font-bold text-xs mt-0.5">{userStats?.primary_language || "TypeScript"}</div>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/[0.06]">
                    <div className="text-zinc-400">Total Karma</div>
                    <div className="text-emerald-400 font-bold text-xs mt-0.5">{(userStats?.total_karma || 0).toLocaleString()} pts</div>
                  </div>
                </div>
              </div>

              {/* Fresh Issues */}
              <div className="space-y-2">
                <div className="font-bold text-zinc-200">🎯 Fresh Starter Issues in Your Stack</div>
                <div className="p-2.5 rounded-lg bg-[#121214] border border-white/[0.06] space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-sky-400 font-bold">vercel/next.js</span>
                    <span className="text-emerald-400">Tier S · 94% Merge</span>
                  </div>
                  <p className="text-zinc-300 font-medium text-[11px]">
                    Fix edge routing regex cache hit #71249
                  </p>
                </div>
              </div>

              {/* Pro Sniper Box */}
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-center space-y-1">
                <div className="text-[10px] font-mono font-bold text-indigo-300 uppercase">
                  ⚡ 18 Issues Claimed in &lt;3 Mins This Week
                </div>
                <p className="text-[11px] text-zinc-300">
                  Pro members get instant Telegram &amp; Discord push alerts within 30 seconds.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-xs font-mono text-zinc-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggle?.(true);
                  setShowPreview(false);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all cursor-pointer"
              >
                Keep Sunday Wrap Active ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
