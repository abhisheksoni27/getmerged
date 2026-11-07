"use client";

import { SlidersHorizontal } from "lucide-react";
import { DimensionGrid } from "./PhaseViews";
import { DeepSections, DosDonts } from "./report-sections";
import type { AuditAIInsights } from "./types";

export function InsightsEpilogue({ insights }: { insights: AuditAIInsights }) {
  return (
    <>
      <DosDonts dos={insights.top_dos ?? []} donts={insights.top_donts ?? []} />
      {insights.deep_sections?.length > 0 && (
        <DeepSections sections={insights.deep_sections} />
      )}
    </>
  );
}

export function DiagnosticsSuite() {
  return (
    <section className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-base font-extrabold font-mono text-[var(--text-primary)] flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
            10-Dimension Maintainer Intelligence Suite
          </h2>
          <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
            Comprehensive scan vectors analyzed using GitHub GraphQL & Maintainer Tokens
          </p>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md">
          10 of 10 Dimensions Active
        </span>
      </div>

      <DimensionGrid />
    </section>
  );
}
