"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, CheckCircle2, AlertCircle, MinusCircle, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import type { RepoPlaybookPayload, RankGapItem } from "@/types/opendoor";

interface RaiseYourRankProps {
  fullName: string;
  onClaimClick: () => void;
}

const statusStyle: Record<string, { icon: React.ElementType; ring: string }> = {
  gap: { icon: AlertCircle, ring: "text-amber-600 bg-amber-950/80 border-amber-800/80 border-amber-400" },
  ok: { icon: CheckCircle2, ring: "text-emerald-400 bg-emerald-950/80 border-emerald-800/80 border-emerald-400" },
  insufficient_data: { icon: MinusCircle, ring: "text-zinc-300 glass-card border-white/[0.12]" },
};

export function RaiseYourRank({ fullName, onClaimClick }: RaiseYourRankProps) {
  const [playbook, setPlaybook] = useState<RepoPlaybookPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}/playbook`,
          { headers: { Accept: "application/json" }, credentials: "include" }
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data: RepoPlaybookPayload = await res.json();
        if (!cancelled && data && Array.isArray(data.checklist)) setPlaybook(data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fullName]);

  if (failed || !playbook) return null;

  const tier = playbook.c_rank_tier || " - ";

  // AC2: unauthenticated visitors get only repo name + C-Rank tier - no
  // per-metric detail. A compact locked card still converts badge traffic.
  if (playbook.locked) {
    return (
      <section
        id="raise-your-rank"
        className="scroll-mt-36 relative rounded-2xl border-2 border-white/[0.1] glass-panel p-5 shadow-sm mb-10"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white/[0.1] bg-amber-400/20 text-white shadow-sm -rotate-2">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="font-space text-base font-extrabold text-white">Raise Your C-Rank</h2>
          </div>
          <span className="px-3 py-1 rounded-lg border border-white/[0.12] glass-panel font-mono text-xs font-bold text-zinc-200 shadow-sm">
            {playbook.repo_full_name} · tier {tier}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mt-3">
          Sign in and verify ownership to unlock your full prioritized checklist,
          automated re-scores, and a before/after share card.
        </p>
        <button
          type="button"
          onClick={onClaimClick}
          className="mt-4 inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-2xl border border-white/[0.12] shadow-sm hover:shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" /> Verify ownership &amp; unlock the playbook
        </button>
      </section>
    );
  }

  // AC2: no metric backed by real telemetry -> a single explicit line,
  // never fabricated zeros or median math.
  if (playbook.valid_metrics <= 0) return null;

  return (
    <section
      id="raise-your-rank"
      className="scroll-mt-36 relative rounded-2xl border-2 border-white/[0.1] glass-panel p-5 sm:p-6 shadow-sm mb-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white/[0.1] bg-amber-400/20 text-white shadow-sm -rotate-2">
            <TrendingUp className="h-4 w-4" />
          </div>
          <h2 className="font-space text-base font-extrabold text-white">Raise Your C-Rank</h2>
        </div>
        <span className="px-3 py-1 rounded-lg border border-white/[0.12] glass-panel font-mono text-xs font-bold text-zinc-200 shadow-sm">
          score {Math.round(playbook.c_rank_score)} · tier {tier}
        </span>
      </div>

      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
        Actionable improvements based on your GitHub activity - each row shows your current metric against the
        S-tier benchmark and the fix to improve it. Maintainers can verify ownership to unlock
        automated re-scores and progress tracking.
      </p>

      <div className="space-y-3">
        {playbook.checklist.map((item: RankGapItem) => {
          const style = statusStyle[item.status] ?? statusStyle.insufficient_data;
          const Icon = style.icon;
          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border-2 ${
                item.status === "ok"
                  ? "bg-emerald-950/70 border-emerald-800/80/70 border-emerald-300"
                  : item.status === "insufficient_data"
                  ? "glass-card border-white/[0.12]"
                  : "glass-panel border-white/[0.1] shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={`mt-0.5 p-1 rounded-lg border ${style.ring} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white">{item.title}</div>
                    <div
                      className={`text-xs mt-1 font-mono break-words ${
                        item.status === "ok" ? "text-emerald-400" : "text-zinc-300"
                      }`}
                    >
                      {item.gap}
                    </div>
                    {item.fix_guidance && item.status !== "ok" && (
                      <div className="text-xs text-blue-700 font-medium mt-1.5">
                        Fix: {item.fix_guidance}
                      </div>
                    )}
                  </div>
                </div>
                <span className="px-2 py-0.5 glass-card text-yellow-300 font-mono text-xs font-bold rounded-lg shrink-0 border border-white/[0.1]">
                  +{item.impact_pts} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onClaimClick}
        className="mt-5 inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-2xl border border-white/[0.12] shadow-sm hover:shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
      >
        <ShieldCheck className="w-4 h-4" /> Verify ownership &amp; unlock automated re-scores
      </button>
    </section>
  );
}
