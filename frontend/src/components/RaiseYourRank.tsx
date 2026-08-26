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
  gap: { icon: AlertCircle, ring: "text-amber-600 bg-amber-100 border-amber-400" },
  ok: { icon: CheckCircle2, ring: "text-emerald-700 bg-emerald-100 border-emerald-400" },
  insufficient_data: { icon: MinusCircle, ring: "text-zinc-500 bg-zinc-100 border-zinc-300" },
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

  const tier = playbook.c_rank_tier || "—";

  // AC2: unauthenticated visitors get only repo name + C-Rank tier — no
  // per-metric detail. A compact locked card still converts badge traffic.
  if (playbook.locked) {
    return (
      <section
        id="raise-your-rank"
        className="scroll-mt-36 relative rounded-2xl border-2 border-brand-dark bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5 shadow-[5px_5px_0px_#222831] mb-10"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-brand-dark bg-yellow-200 text-zinc-950 shadow-[2px_2px_0px_#222831] -rotate-2">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="font-space text-base font-extrabold text-zinc-950">Raise Your C-Rank</h2>
          </div>
          <span className="px-3 py-1 rounded-lg border-2 border-black bg-white font-mono text-xs font-bold text-zinc-800 shadow-[2px_2px_0px_#000]">
            {playbook.repo_full_name} · tier {tier}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed mt-3">
          Sign in and verify ownership to unlock your full prioritized checklist,
          automated re-scores, and a before/after share card.
        </p>
        <button
          type="button"
          onClick={onClaimClick}
          className="mt-4 inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
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
      className="scroll-mt-36 relative rounded-2xl border-2 border-brand-dark bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5 sm:p-6 shadow-[5px_5px_0px_#222831] mb-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-brand-dark bg-yellow-200 text-zinc-950 shadow-[2px_2px_0px_#222831] -rotate-2">
            <TrendingUp className="h-4 w-4" />
          </div>
          <h2 className="font-space text-base font-extrabold text-zinc-950">Raise Your C-Rank</h2>
        </div>
        <span className="px-3 py-1 rounded-lg border-2 border-black bg-white font-mono text-xs font-bold text-zinc-800 shadow-[2px_2px_0px_#000]">
          score {Math.round(playbook.c_rank_score)} · tier {tier}
        </span>
      </div>

      <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed mb-4">
        Quantified gaps from live telemetry — each row shows your current value against the
        S-tier target and the one fix that closes it. Maintainers can verify ownership to unlock
        automated re-scores and a before/after share card.
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
                  ? "bg-emerald-50/70 border-emerald-300"
                  : item.status === "insufficient_data"
                  ? "bg-zinc-50 border-zinc-300"
                  : "bg-white border-brand-dark shadow-[3px_3px_0px_#222831]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={`mt-0.5 p-1 rounded-lg border ${style.ring} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-zinc-900">{item.title}</div>
                    <div
                      className={`text-xs mt-1 font-mono break-words ${
                        item.status === "ok" ? "text-emerald-700" : "text-zinc-700"
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
                <span className="px-2 py-0.5 bg-zinc-900 text-yellow-300 font-mono text-xs font-bold rounded-lg shrink-0 border border-black">
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
        className="mt-5 inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
      >
        <ShieldCheck className="w-4 h-4" /> Verify ownership &amp; unlock automated re-scores
      </button>
    </section>
  );
}
