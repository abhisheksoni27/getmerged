"use client";

import { AlertTriangle, ShieldAlert, Users } from "lucide-react";
import { FrictionBar } from "./primitives";
import type { FrictionFingerprint, ReviewerHealth as ReviewerHealthData } from "./types";
import type { FrictionBarConfig, ReviewerRow } from "./report-derivations";

export function ReviewerHealthSection({
  reviewerRows,
  isConcentrated,
  busFactor,
}: {
  reviewerRows: ReviewerRow[];
  isConcentrated: boolean;
  busFactor: number;
}) {
  return (
    <section className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-[var(--text-primary)] mb-3">
        <Users className="h-4 w-4 text-sky-400" /> Reviewer Team Health
      </h2>
      <div className="space-y-2.5 text-xs font-mono mb-4">
        {reviewerRows.map((row, i) => (
          <div
            key={row.key}
            className={`flex justify-between items-center ${i < reviewerRows.length - 1 ? "border-b border-[var(--border-subtle)] pb-2" : "pb-1"}`}
          >
            <span className="text-[var(--text-secondary)]">{row.label}</span>
            <span className={`font-bold ${row.valueClass}`}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Burnout signal */}
      {isConcentrated && (
        <div className="rounded-xl border border-rose-800/50 bg-rose-950/25 p-3">
          <p className="text-[11px] font-mono text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5 inline mr-1 mb-0.5" />
            <span className="font-bold">Burnout Risk:</span>{" "}
            {busFactor <= 1
              ? "A single reviewer is your entire bottleneck. If they step back, PRs stall."
              : "Small core team - consider explicitly mentoring 1-2 contributors toward reviewer status."
            }
          </p>
        </div>
      )}
    </section>
  );
}

export function FrictionBreakdownSection({
  fingerprint,
  bars,
}: {
  fingerprint: FrictionFingerprint;
  bars: FrictionBarConfig[];
}) {
  const ff = fingerprint;
  return (
    <section className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-[var(--text-primary)] mb-3">
        <ShieldAlert className="h-4 w-4 text-rose-400" /> Review Friction Breakdown
      </h2>
      <div className="space-y-3 mb-4">
        {bars.map((b) => (
          <FrictionBar key={b.key} label={b.label} pct={b.pct} color={b.color} />
        ))}
      </div>
      {/* Friction insight */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-black/20 p-3">
        <p className="text-[11px] font-mono text-[var(--text-secondary)]">
          {ff.formatting_and_style_pct >= 40
            ? <>
                <span className="font-bold text-[var(--text-primary)]">Quick win:</span>{" "}
                {ff.formatting_and_style_pct.toFixed(0)}% of review friction is style/lint - a shared <span className="text-sky-400">.editorconfig</span> or pre-commit hook eliminates most of it without any human review cost.
              </>
            : ff.missing_tests_and_ci_pct >= 35
            ? <>
                <span className="font-bold text-[var(--text-primary)]">Quick win:</span>{" "}
                {ff.missing_tests_and_ci_pct.toFixed(0)}% of friction is missing tests. A required CI status check blocks this category before it reaches review.
              </>
            : <>
                <span className="font-bold text-[var(--text-primary)]">Architectural discussions</span> dominate your review friction - consider RFC or proposal templates for large changes.
              </>
          }
        </p>
      </div>
    </section>
  );
}

export function HealthFrictionGrid({
  reviewerHealth,
  fingerprint,
  reviewerRows,
  frictionBars,
  isConcentrated,
}: {
  reviewerHealth: ReviewerHealthData | undefined;
  fingerprint: FrictionFingerprint | undefined;
  reviewerRows: ReviewerRow[];
  frictionBars: FrictionBarConfig[];
  isConcentrated: boolean;
}) {
  if (!reviewerHealth && !fingerprint) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {reviewerHealth && (
        <ReviewerHealthSection reviewerRows={reviewerRows} isConcentrated={isConcentrated} busFactor={reviewerHealth.bus_factor} />
      )}
      {fingerprint && (
        <FrictionBreakdownSection fingerprint={fingerprint} bars={frictionBars} />
      )}
    </div>
  );
}
