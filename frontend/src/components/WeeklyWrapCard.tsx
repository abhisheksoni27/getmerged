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
    <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 space-y-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0D9668] shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#0D9668] text-xs font-mono mb-1 font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Sunday 6:00 PM Dispatch</span>
            </div>
            <h3 className="text-lg font-bold font-space text-[var(--text-primary)]">
              Weekly Contributor Wrap
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-0.5 max-w-md">
              A high-retention Sunday recap of your weekly streak, earned Karma points, PR review turnaround times, and 3 curated Good First Issues in your tech stack.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)] text-xs font-mono transition-all cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            <span>Preview Wrap</span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => onToggle?.(!isSubscribed)}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
              isSubscribed
                ? "bg-emerald-50 border border-emerald-200 text-[#0D9668]"
                : "bg-[var(--brand-terracotta)] text-white hover:bg-[var(--brand-terracotta)]/90 shadow-xs"
            }`}
          >
            {isSubscribed ? "Subscribed ✓" : "Enable"}
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
          <div className="text-[#C4910A] font-mono text-xs font-bold flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            <span>Streak &amp; Momentum</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-sans">
            Track weekly XP deltas, reputation level title, and active merge streaks.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
          <div className="text-[#0D9668] font-mono text-xs font-bold flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            <span>Curated Issue Drop</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-sans">
            Top 3 verified beginner issues matching your primary programming languages.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
          <div className="text-[#8B6BB5] font-mono text-xs font-bold flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            <span>Repo Spotlight</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-sans">
            High-turnaround Tier-S repos actively merging first-time external PRs.
          </p>
        </div>
      </div>

      {/* Interactive Wrap Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto font-sans">
          <div className="relative w-full max-w-lg rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-7 space-y-5 shadow-2xl text-[var(--text-primary)]">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="absolute right-5 top-5 p-2 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#0D9668] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Email Preview
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                Subject: 🔥 3-Wk Streak · +150 Karma &amp; Your Weekly Contributor Wrap
              </span>
            </div>

            {/* Email Container Mockup */}
            <div className="p-5 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <span className="font-bold font-space text-[var(--text-primary)] text-sm">
                  ⚡ GetMerged <span className="text-[var(--text-muted)] font-normal">Weekly Wrap</span>
                </span>
                <span className="font-mono text-[10px] text-[#0D9668] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Verified Proof
                </span>
              </div>

              {/* Momentum Card */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="text-[10px] font-mono text-[#0D9668] font-bold uppercase">
                  Your Contributor Momentum
                </div>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  Welcome back, <span className="text-[#0D9668]">@{userStats?.username || "Contributor"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                  <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="text-[var(--text-muted)]">Streak</div>
                    <div className="text-[#C4910A] font-bold text-xs mt-0.5">🔥 {userStats?.streak_weeks || 1} Wks</div>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="text-[var(--text-muted)]">Stack</div>
                    <div className="text-[var(--text-primary)] font-bold text-xs mt-0.5">{userStats?.primary_language || "TypeScript"}</div>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="text-[var(--text-muted)]">Total Karma</div>
                    <div className="text-[#0D9668] font-bold text-xs mt-0.5">{(userStats?.total_karma || 0).toLocaleString()} pts</div>
                  </div>
                </div>
              </div>

              {/* Fresh Issues */}
              <div className="space-y-2">
                <div className="font-bold text-[var(--text-primary)]">🎯 Fresh Starter Issues in Your Stack</div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-[#2D8ABF] font-bold">vercel/next.js</span>
                    <span className="text-[#0D9668]">Tier S · 94% Merge</span>
                  </div>
                  <p className="text-[var(--text-secondary)] font-medium text-xs">
                    Fix edge routing regex cache hit #71249
                  </p>
                </div>
              </div>

              {/* Pro Sniper Box */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-1">
                <div className="text-[10px] font-mono font-bold text-[#C4910A] uppercase">
                  ⚡ 18 Issues Claimed in &lt;3 Mins This Week
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Pro members get instant Telegram &amp; Discord push alerts within 30 seconds.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggle?.(true);
                  setShowPreview(false);
                }}
                className="px-5 py-2 rounded-xl bg-[#0D9668] hover:bg-[#0D9668]/90 text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-xs"
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
