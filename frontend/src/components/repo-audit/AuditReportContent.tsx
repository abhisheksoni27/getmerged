"use client";

import { useMemo } from "react";
import { Clock, GitMerge, GitPullRequest, Users } from "lucide-react";
import { generateAuditHtml } from "@/lib/exportAuditHtml";
import type { AuditReport } from "./types";
import {
  buildFrictionBars,
  buildFunnelTiles,
} from "./report-derivations";
import type {
  ReviewerRow,
  TemplateCard,
  VibeScore,
  VitalItem,
} from "./report-derivations";
import { SummaryHeader, TopPrioritySignal } from "./SummaryHeader";
import { FunnelSection } from "./FunnelSection";
import { HealthFrictionGrid } from "./ReviewerHealth";
import { VibeSection } from "./VibeSection";
import { BenchmarkFactors } from "./BenchmarkFactors";
import { RemediationSection } from "./RemediationSection";
import { TemplateCardsSection } from "./TemplateCards";
import { DiagnosticsSuite, InsightsEpilogue } from "./ReportEpilogue";

export function AuditReportContent({
  report: r,
  onRegenerate,
  regenLoading,
  regenNote,
}: {
  report: AuditReport;
  onRegenerate?: () => void;
  regenLoading?: boolean;
  regenNote?: string | null;
}) {
  const handleDownloadHtml = () => {
    const htmlContent = generateAuditHtml(r);
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.repo.full_name.replace("/", "-")}-deep-audit.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Memoized maintainer-focused derivations from existing data
  const rh = r.reviewer_health;
  const pf = r.pr_funnel;
  const ff = r.friction_fingerprint;

  const ghostRate = useMemo(
    () => (pf ? Math.max(0, 100 - pf.first_timer_success_rate - pf.repeat_contributor_rate * 0.5) : null),
    [pf]
  );
  const isReviewerConcentrated = useMemo(
    () => !!rh && (rh.bus_factor <= 1 || rh.distinct_maintainers <= 2),
    [rh]
  );
  const avgResponseH = rh?.time_to_first_response_h ?? null;
  const topBottleneck = useMemo(
    () => r.factors.find((f) => f.status === "Bottleneck") ?? r.factors.find((f) => f.status === "Needs Attention"),
    [r.factors]
  );
  const funnelTiles = useMemo(() => (pf ? buildFunnelTiles(pf) : []), [pf]);
  const frictionBars = useMemo(() => (ff ? buildFrictionBars(ff) : []), [ff]);

  const vitals: VitalItem[] = useMemo(() => {
    if (!rh) return [];
    return [
      { key: "response", Icon: Clock, iconClass: "text-amber-400", label: "First response", value: `${rh.time_to_first_response_h.toFixed(1)}h` },
      { key: "merge", Icon: GitMerge, iconClass: "text-emerald-400", label: "Merge rate", value: pf ? `${pf.merge_rate.toFixed(1)}%` : " - " },
      { key: "reviewers", Icon: Users, iconClass: "text-sky-400", label: "Active reviewers", value: `${rh.distinct_maintainers}` },
      { key: "rounds", Icon: GitPullRequest, iconClass: "text-purple-400", label: "Avg review rounds", value: `${rh.avg_review_rounds.toFixed(1)}` },
    ];
  }, [rh, pf]);

  const reviewerRows: ReviewerRow[] = useMemo(() => {
    if (!rh) return [];
    return [
      { key: "active", label: "Active Reviewers", value: `${rh.distinct_maintainers} people`, valueClass: "text-white" },
      {
        key: "bus",
        label: "Bus Factor",
        value: `${rh.bus_factor}`,
        valueClass: rh.bus_factor <= 1 ? "text-rose-400" : rh.bus_factor <= 2 ? "text-amber-400" : "text-emerald-400",
      },
      {
        key: "response",
        label: "First-Response Time",
        value: `${rh.time_to_first_response_h.toFixed(1)}h`,
        valueClass: (avgResponseH ?? 0) > 72 ? "text-rose-400" : (avgResponseH ?? 0) > 24 ? "text-amber-400" : "text-emerald-400",
      },
      {
        key: "concentration",
        label: "Concentration Risk",
        value: rh.concentration_risk,
        valueClass: `text-right max-w-[160px] ${isReviewerConcentrated ? "text-rose-400" : "text-[var(--text-secondary)]"}`,
      },
    ];
  }, [rh, avgResponseH, isReviewerConcentrated]);

  const vibeScores: VibeScore[] = useMemo(() => {
    const scores: VibeScore[] = [];
    if (r.ai_insights.warmth_score > 0) {
      scores.push({ key: "warmth", label: "Warmth Score", value: r.ai_insights.warmth_score, valueClass: "text-rose-300", barClass: "bg-rose-500/70" });
    }
    if (r.ai_insights.patience_score > 0) {
      scores.push({ key: "patience", label: "Patience Score", value: r.ai_insights.patience_score, valueClass: "text-sky-300", barClass: "bg-sky-500/70" });
    }
    return scores;
  }, [r.ai_insights]);

  const templateCards: TemplateCard[] = useMemo(() => {
    if (!r.actionable_templates) return [];
    return [
      { key: "pr_template", filename: ".github/pull_request_template.md", text: r.actionable_templates.pull_request_template },
      { key: "contributing", filename: "CONTRIBUTING.md (Review SLA section)", text: r.actionable_templates.contributing_guide },
    ];
  }, [r.actionable_templates]);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <SummaryHeader report={r} vitals={vitals} onDownload={handleDownloadHtml} />

      {/* ── TOP PRIORITY SIGNAL ── show the #1 thing to act on */}
      <TopPrioritySignal factor={topBottleneck} />

      {/* ── PR FUNNEL ── */}
      {pf && (
        <FunnelSection funnel={pf} tiles={funnelTiles} ghostRate={ghostRate} />
      )}

      {/* ── REVIEWER HEALTH + BURNOUT SIGNAL ── */}
      <HealthFrictionGrid
        reviewerHealth={rh}
        fingerprint={ff}
        reviewerRows={reviewerRows}
        frictionBars={frictionBars}
        isConcentrated={isReviewerConcentrated}
      />

      {/* ── MAINTAINER VIBE ── */}
      <VibeSection insights={r.ai_insights} scores={vibeScores} />

      {/* ── PER-FACTOR BENCHMARK ── */}
      <BenchmarkFactors factors={r.factors} />

      {/* ── AI PRIORITIZED FIXES ── */}
      <RemediationSection
        fixes={r.prioritized_fixes}
        onRegenerate={onRegenerate}
        regenLoading={regenLoading}
        regenNote={regenNote}
      />

      {/* ── DOS & DON'TS ── */}
      {/* ── DEEP SECTIONS ── */}
      <InsightsEpilogue insights={r.ai_insights} />

      {/* ── READY-TO-COPY GITHUB PATCHES ── */}
      {r.actionable_templates && (
        <TemplateCardsSection cards={templateCards} />
      )}

      {/* ── 10-DIMENSION DIAGNOSTIC COVERAGE ── */}
      <DiagnosticsSuite />
    </div>
  );
}
