"use client";

import React, { useEffect, useState } from "react";
import { Zap, ShieldCheck, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { PRSizeSweetSpotData } from "@/types/opendoor";

interface PRSizeSweetSpotCardProps {
  repoId: string;
  repoFullName: string;
  initialData?: PRSizeSweetSpotData | null;
}

export function PRSizeSweetSpotCard({
  repoId,
  repoFullName,
  initialData = null,
}: PRSizeSweetSpotCardProps) {
  const [data, setData] = useState<PRSizeSweetSpotData | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }

    async function fetchSweetSpot() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(repoId)}/pr-size-sweetspot`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Degrade gracefully
      } finally {
        setLoading(false);
      }
    }
    if (repoId) {
      fetchSweetSpot();
    }
  }, [repoId, initialData]);

  if (loading || !data) return null;

  const formatHours = (hours: number) => {
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = (hours / 24).toFixed(1);
    return `${days}d`;
  };

  return (
    <div className="rounded-3xl border border-[var(--border-subtle)] p-6 sm:p-7 bg-[var(--bg-surface)] relative overflow-hidden shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#C4910A]/10 border border-[#C4910A]/30 text-[#C4910A] text-xs font-mono font-semibold">
            <Zap className="h-3.5 w-3.5 text-[#C4910A] fill-[#C4910A]" />
            <span>PR Size vs Review Speed</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-display text-[var(--text-primary)]">
            Best Pull Request Size for {repoFullName}
          </h3>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#C4910A]/10 border border-[#C4910A]/30 text-[#C4910A] font-mono text-xs">
          <Sparkles className="h-4 w-4 text-[#C4910A]" />
          <span>Sweet Spot: <strong className="text-[var(--text-primary)] font-bold">{data.sweet_spot_threshold}</strong></span>
        </div>
      </div>

      {/* 3 Size Comparison Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Small PR */}
        <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[#0D9668]/30 relative space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-[#0D9668] flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Small ({data.small_pr.line_range})
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0D9668]/15 text-[#0D9668] font-bold">
              Recommended
            </span>
          </div>
          <div className="space-y-1 pt-1">
            <div className="text-2xl font-bold font-mono text-[var(--text-primary)] flex items-baseline gap-1">
              {formatHours(data.small_pr.median_merge_hours)}
              <span className="text-xs text-[var(--text-tertiary)] font-sans">avg review</span>
            </div>
            <div className="text-xs font-mono text-[#0D9668] font-semibold">
              {Math.round(data.small_pr.merge_rate)}% Merge Approval
            </div>
          </div>
        </div>

        {/* Medium PR */}
        <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-[var(--text-secondary)]">
              Medium ({data.medium_pr.line_range})
            </span>
            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">Normal</span>
          </div>
          <div className="space-y-1 pt-1">
            <div className="text-2xl font-bold font-mono text-[var(--text-primary)] flex items-baseline gap-1">
              {formatHours(data.medium_pr.median_merge_hours)}
              <span className="text-xs text-[var(--text-tertiary)] font-sans">avg review</span>
            </div>
            <div className="text-xs font-mono text-[var(--text-secondary)] font-semibold">
              {Math.round(data.medium_pr.merge_rate)}% Merge Approval
            </div>
          </div>
        </div>

        {/* Large PR */}
        <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[#C4463A]/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-[#C4463A] flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Large ({data.large_pr.line_range})
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#C4463A]/15 text-[#C4463A] font-bold">
              Slow
            </span>
          </div>
          <div className="space-y-1 pt-1">
            <div className="text-2xl font-bold font-mono text-[var(--text-primary)] flex items-baseline gap-1">
              {formatHours(data.large_pr.median_merge_hours)}
              <span className="text-xs text-[var(--text-tertiary)] font-sans">avg review</span>
            </div>
            <div className="text-xs font-mono text-[#C4463A] font-semibold">
              {Math.round(data.large_pr.merge_rate)}% Merge Approval
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Advice Banner */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-start gap-3">
        <TrendingUp className="h-4 w-4 text-[#C4910A] shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
          <strong className="text-[var(--text-primary)]">Maintainer Strategy:</strong> {data.actionable_advice}
        </p>
      </div>
    </div>
  );
}
