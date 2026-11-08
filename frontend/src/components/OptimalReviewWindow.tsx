"use client";

import React, { useEffect, useState } from "react";
import { Clock, Calendar } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { OptimalTimeResponse, OptimalTimeResult } from "@/types/opendoor";
import { formatUTCRangeToLocal, getUserTimeZone, padZero } from "@/lib/timezone";

interface OptimalReviewWindowProps {
  fullName: string;
  initialData?: OptimalTimeResult | null;
}

export function OptimalReviewWindow({ fullName, initialData = null }: OptimalReviewWindowProps) {
  const [data, setData] = useState<OptimalTimeResult | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }
    let isSubscribed = true;

    async function fetchOptimalTime() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/optimal-time?name=${encodeURIComponent(fullName)}`);
        if (res.ok) {
          const json: OptimalTimeResponse = await res.json();
          if (isSubscribed && json.optimal_time) {
            setData(json.optimal_time);
          }
        }
      } catch (err) {
        console.error("Failed to fetch optimal time data:", err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    fetchOptimalTime();
    return () => {
      isSubscribed = false;
    };
  }, [fullName, initialData]);

  if (loading || !data) return null;

  const startHour = data.primary_start_hour_utc ?? 14;
  const endHour = data.primary_end_hour_utc ?? 19;
  const dayWindow = data.recommended_day_window || "Tue & Thu";
  const userTz = isMounted ? getUserTimeZone() : "UTC";
  const localRangeStr = isMounted ? formatUTCRangeToLocal(startHour, endHour) : "";

  return (
    <div className="card h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[var(--purple-bright)]" />
            <span>Optimal Review Window</span>
          </div>
          <span className="pill pill-purple font-mono">{data.active_maintainer_count ?? 1} Active</span>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mb-4">
          Maintainers are most responsive during these observed active hours:
        </p>

        {/* Highlighted Primary Active Window */}
        <div className="p-3.5 bg-[#0D111A] border border-[var(--border-accent)] rounded-md mb-3 shadow-[0_0_16px_var(--purple-glow)]">
          <div className="tele-label">Primary Active Window</div>
          <div className="font-mono text-base font-bold text-[var(--purple-bright)] my-1">
            {dayWindow} • {padZero(startHour)}:00 – {padZero(endHour)}:00 UTC
          </div>
          {localRangeStr && (
            <div className="text-xs text-[var(--text-secondary)] font-mono">
              Local: {localRangeStr} ({userTz})
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
        <span className="pill pill-purple">
          <Calendar className="h-3 w-3" />
          <span>{dayWindow}</span>
        </span>
        <span className="pill font-mono">Peak: {padZero(data.peak_hour_utc ?? 16)}:00 UTC</span>
        <span className="pill text-[var(--text-tertiary)] font-mono">Confidence: {Math.round((data.confidence_score ?? 1) * 100)}%</span>
      </div>
    </div>
  );
}
