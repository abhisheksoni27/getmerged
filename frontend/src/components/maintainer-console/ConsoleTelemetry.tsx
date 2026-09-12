"use client";

import React, { useMemo } from "react";
import { MaintainerConsolePayload } from "@/types/opendoor";
import { MetricTile } from "./FormField";
import { formatResponseHours, formatPercent } from "./validation";

interface ConsoleTelemetryProps {
  breakdown: MaintainerConsolePayload["breakdown"];
}

export function ConsoleTelemetry({ breakdown }: ConsoleTelemetryProps) {
  const metrics = useMemo(
    () => [
      { label: "Review Latency p50", value: formatResponseHours(breakdown.response_p50_hours) },
      { label: "First-PR Merge Rate", value: formatPercent(breakdown.first_timer_success_rate) },
      { label: "Overall PR Merge Rate", value: formatPercent(breakdown.external_pr_merge_rate) },
      { label: "Good First Issues", value: breakdown.good_first_issue_count },
      { label: "Onboarding Docs", value: `${breakdown.onboarding_score}/100` },
      { label: "90-Day Bus Factor", value: breakdown.bus_factor },
    ],
    [breakdown]
  );

  return (
    <div>
      <h3 className="text-sm font-bold text-white mb-3">Live Telemetry Breakdown</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
        {metrics.map((metric) => (
          <MetricTile key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </div>
    </div>
  );
}
