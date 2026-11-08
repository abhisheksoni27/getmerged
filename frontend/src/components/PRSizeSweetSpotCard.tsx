"use client";

import React, { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { PRSizeSweetSpotData } from "@/types/opendoor";

interface PRSizeSweetSpotCardProps {
  repoId: string;
  repoFullName?: string;
  initialData?: PRSizeSweetSpotData | null;
}

export function PRSizeSweetSpotCard({
  repoId,
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

  const smallRate = Math.round(data.small_pr?.merge_rate ?? 94);
  const medRate = Math.round(data.medium_pr?.merge_rate ?? 75);
  const largeRate = Math.round(data.large_pr?.merge_rate ?? 40);

  return (
    <div className="card h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-[var(--green-bright)]" />
            <span>PR Size Sweet Spot</span>
          </div>
          <span className="pill pill-green font-mono">{data.sweet_spot_threshold || "< 150 lines"}</span>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mb-4">
          Historical merge velocity and acceptance rate categorized by lines of code:
        </p>

        <div className="space-y-2">
          {/* Small PRs - The Sweet Spot */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-md bg-[rgba(63,185,80,0.08)] border border-[rgba(63,185,80,0.3)]">
            <div>
              <strong className="text-xs text-[var(--text-primary)]">Small (&lt; 150 lines)</strong>
              <span className="text-[11px] text-[var(--text-tertiary)] ml-1.5 font-mono">
                {data.small_pr?.review_likelihood || "Fast Review (<24h)"}
              </span>
            </div>
            <div className="font-mono tabular text-xs font-bold text-[var(--green-bright)]">
              {smallRate}% Merge
            </div>
          </div>

          {/* Medium PRs */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-md bg-[#0D111A] border border-[var(--border-subtle)]">
            <div>
              <strong className="text-xs text-[var(--text-primary)]">Medium (150–500 lines)</strong>
              <span className="text-[11px] text-[var(--text-tertiary)] ml-1.5 font-mono">
                {data.medium_pr?.review_likelihood || "Moderate"}
              </span>
            </div>
            <div className="font-mono tabular text-xs font-semibold text-[var(--text-primary)]">
              {medRate}% Merge
            </div>
          </div>

          {/* Large PRs */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-md bg-[#0D111A] border border-[var(--border-subtle)]">
            <div>
              <strong className="text-xs text-[var(--text-primary)]">Large (&gt; 500 lines)</strong>
              <span className="text-[11px] text-[var(--text-tertiary)] ml-1.5 font-mono">
                {data.large_pr?.review_likelihood || "High Risk"}
              </span>
            </div>
            <div className="font-mono tabular text-xs font-semibold text-[var(--accent-warning)]">
              {largeRate}% Merge
            </div>
          </div>
        </div>
      </div>

      {data.actionable_advice && (
        <p className="mt-3 text-[11px] text-[var(--text-tertiary)] italic border-t border-[var(--border-subtle)] pt-2.5">
          Tip: {data.actionable_advice}
        </p>
      )}
    </div>
  );
}
