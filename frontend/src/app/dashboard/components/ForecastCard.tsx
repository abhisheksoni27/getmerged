"use client";

import React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { Forecast } from "./types";

interface ForecastCardProps {
  forecast?: Forecast | null;
  forecastLocked: boolean;
}

// AC4: Pro-gated transparent rule-based forecast.
export function ForecastCard({ forecast, forecastLocked }: ForecastCardProps) {
  return (
    <div className="mt-2">
      {forecast ? (
        <div className="text-xs text-[var(--text-secondary)]">
          <span className="font-semibold">Acceptance outlook:</span>{" "}
          <span className="font-bold capitalize">{forecast.label}</span> ({forecast.score}/100)
          <ul className="list-disc ml-5 mt-1 space-y-0.5 text-[var(--text-secondary)]">
            {forecast.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="mt-1 text-[var(--text-secondary)] italic">{forecast.basis}</div>
        </div>
      ) : null}
    </div>
  );
}
