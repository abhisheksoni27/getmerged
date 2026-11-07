"use client";

import React, { useMemo } from "react";
import type { Benchmark } from "./types";
import { fmtHours } from "./dashboard-utils";

interface BenchmarkCardProps {
  benchmark: Benchmark | null;
}

// AC3: benchmark line from /api/v1/pr-likelihood medians.
export function BenchmarkCard({ benchmark }: BenchmarkCardProps) {
  const parts = useMemo(
    () => ({
      p50: fmtHours(benchmark?.response_p50_hours),
      p90: fmtHours(benchmark?.response_p90_hours),
      merge: fmtHours(benchmark?.median_time_to_merge_hours),
    }),
    [benchmark]
  );
  return (
    <div className="mt-3 rounded-lg glass-card border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)]">
      <span className="font-semibold text-[var(--text-secondary)]">Repo review pace:</span> p50 {parts.p50} · p90{" "}
      {parts.p90} · merge {parts.merge}
    </div>
  );
}
