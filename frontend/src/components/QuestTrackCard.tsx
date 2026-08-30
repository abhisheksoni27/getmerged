"use client";

import React, { useEffect, useState } from "react";
import { Award, CheckCircle2, Circle, Sparkles, Target, Zap, Radar, Crosshair, GitMerge } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface Quest {
  id: string;
  title: string;
  description: string;
  karma_reward: number;
  is_completed: boolean;
  progress_percentage: number;
  category: string;
  icon_name: string;
}

interface QuestTrackData {
  total_quests: number;
  completed_quests: number;
  total_karma_earned: number;
  completion_rate: number;
  quests: Quest[];
}

export function QuestTrackCard() {
  const [track, setTrack] = useState<QuestTrackData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchQuests() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/user/quests`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setTrack(data);
        }
      } catch {
        // Degrade gracefully
      } finally {
        setLoading(false);
      }
    }
    fetchQuests();
  }, []);

  if (loading || !track || track.quests.length === 0) return null;

  const renderIcon = (name: string, completed: boolean) => {
    const cls = `h-4 w-4 ${completed ? "text-emerald-400" : "text-zinc-500"}`;
    switch (name) {
      case "Radar":
        return <Radar className={cls} />;
      case "Crosshair":
        return <Crosshair className={cls} />;
      case "Zap":
        return <Zap className={cls} />;
      case "GitMerge":
        return <GitMerge className={cls} />;
      default:
        return <Award className={cls} />;
    }
  };

  return (
    <div className="rounded-3xl glass-panel border border-emerald-500/20 p-6 sm:p-7 bg-gradient-to-br from-emerald-950/20 via-zinc-950/70 to-zinc-900/40 shadow-xl space-y-6 text-white font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
            <Target className="h-3.5 w-3.5" />
            <span>Contributor Quest Track</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-space text-white">
            Level Up Your OSS Reputation
          </h3>
          <p className="text-xs text-zinc-400">
            Complete milestones to earn verified Proof-of-Work Karma points.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-emerald-400 flex items-center justify-end gap-1">
              <Sparkles className="h-4 w-4" />
              {track.completed_quests} / {track.total_quests}
            </div>
            <div className="text-[11px] font-mono text-zinc-400">Quests Completed</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono text-zinc-400">
          <span>Overall Mission Progress</span>
          <span>{Math.round(track.completion_rate)}% Complete</span>
        </div>
        <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/[0.08] p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(5, track.completion_rate)}%` }}
          />
        </div>
      </div>

      {/* Quests List */}
      <div className="space-y-2.5">
        {track.quests.map((q) => (
          <div
            key={q.id}
            className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
              q.is_completed
                ? "bg-emerald-950/20 border-emerald-500/30"
                : "bg-zinc-900/60 border-white/[0.06] opacity-90"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5">
                {q.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-zinc-600 shrink-0" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-space text-white">
                    {q.title}
                  </span>
                  {renderIcon(q.icon_name, q.is_completed)}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {q.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <span
                className={`inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                  q.is_completed
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                +{q.karma_reward} Karma
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
