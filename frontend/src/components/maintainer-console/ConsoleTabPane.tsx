"use client";

import React from "react";
import { MaintainerConsolePayload, RescoreResult } from "@/types/opendoor";
import { ConsoleScoreHeader } from "./ConsoleScoreHeader";
import { ConsoleRescoreCard } from "./ConsoleRescoreCard";
import { ConsoleChecklist } from "./ConsoleChecklist";
import { ConsoleTelemetry } from "./ConsoleTelemetry";

interface ConsoleTabPaneProps {
  fullName: string;
  consoleData: MaintainerConsolePayload | null;
  rescoring: boolean;
  rescore: RescoreResult | null;
  onRescore: () => void;
}

export function ConsoleTabPane({ fullName, consoleData, rescoring, rescore, onRescore }: ConsoleTabPaneProps) {
  if (!consoleData) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Score Header Banner */}
      <ConsoleScoreHeader score={consoleData.c_rank_score} tier={consoleData.c_rank_tier} />

      {/* Automated re-score + before/after card (AC3, AC4) */}
      <ConsoleRescoreCard fullName={fullName} rescoring={rescoring} rescore={rescore} onRescore={onRescore} />

      {/* Actionable Checklist (AC6) */}
      <ConsoleChecklist checklist={consoleData.checklist} />

      {/* Metric Breakdown Details */}
      <ConsoleTelemetry breakdown={consoleData.breakdown} />
    </div>
  );
}
