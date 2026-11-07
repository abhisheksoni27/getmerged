"use client";

import React from "react";
import { TrendingUp, RefreshCw, ArrowUpRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { RescoreResult } from "@/types/opendoor";
import { rescoreOutcomeLabel, rescoreCardHref, formatCooldownDate } from "./validation";

interface ConsoleRescoreCardProps {
  fullName: string;
  rescoring: boolean;
  rescore: RescoreResult | null;
  onRescore: () => void;
}

function RescoreResultBlock({ rescore, fullName }: { rescore: RescoreResult | null; fullName: string }) {
  if (!rescore || rescore.rate_limited) return null;
  return (
    <div
      className={`mt-4 p-4 rounded-xl border-2 ${
        rescore.outcome === "improved"
          ? "bg-emerald-950/70 border-emerald-800/80 border-emerald-400"
          : "glass-card border-[var(--border-subtle)]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-sm font-bold text-[var(--text-primary)]">
          <span className="text-[var(--text-secondary)]">before</span> {Math.round(rescore.before_score)}
          {rescore.before_tier ? ` (${rescore.before_tier})` : ""}
          {" → "}
          <span className={rescore.outcome === "improved" ? "text-emerald-400" : ""}>
            after {Math.round(rescore.after_score)}
          </span>
          {rescore.after_tier ? ` (${rescore.after_tier})` : ""}
        </div>
        <span className="px-2 py-0.5 rounded-lg font-mono text-xs font-bold border border-[var(--border-subtle)] glass-panel text-[var(--text-secondary)]">
          {rescoreOutcomeLabel(rescore.outcome)}
        </span>
      </div>
      {rescore.card_issued && (
        <a
          href={rescoreCardHref(rescore.card_url, fullName, API_BASE_URL)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2 cursor-pointer"
        >
          View shareable before/after OG card <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      )}
      {!rescore.card_issued && rescore.outcome !== "improved" && (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          No improvement yet - close a playbook gap and re-score to earn the
          before/after card.
        </p>
      )}
    </div>
  );
}

function RescoreCooldownNote({ rescore }: { rescore: RescoreResult | null }) {
  if (!rescore?.rate_limited) return null;
  return (
    <p className="mt-3 text-xs text-[var(--text-secondary)]">
      Card cooldown active - next card available at{" "}
      {formatCooldownDate(rescore.next_allowed_at)}.
    </p>
  );
}

export function ConsoleRescoreCard({ fullName, rescoring, rescore, onRescore }: ConsoleRescoreCardProps) {
  return (
    <div className="p-4 glass-panel border border-[var(--border-subtle)] rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-bold text-sm text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Automated Re-score
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Recompute your C-Rank from the last 180 days of telemetry and issue a
            before/after share card on improvement.
          </p>
        </div>
        <button
          type="button"
          onClick={onRescore}
          disabled={rescoring}
          className="px-4 py-2.5 glass-card hover:bg-zinc-800 text-white font-bold text-xs rounded-xl border border-[var(--border-subtle)] shadow-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
        >
          {rescoring ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Re-scoring...
            </>
          ) : (
            "Re-score now"
          )}
        </button>
      </div>

      <RescoreResultBlock rescore={rescore} fullName={fullName} />
      <RescoreCooldownNote rescore={rescore} />
    </div>
  );
}
