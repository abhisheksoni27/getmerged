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
      ) : forecastLocked ? (
        <Link prefetch={false}
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-emerald-400"
        >
          <Lock className="h-3 w-3" /> Acceptance forecast - unlock with Pro
        </Link>
      ) : null}
    </div>
  );
}
