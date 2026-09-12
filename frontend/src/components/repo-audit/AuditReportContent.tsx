"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Download,
  GitMerge,
  GitPullRequest,
  Heart,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { generateAuditHtml } from "@/lib/exportAuditHtml";
import { FrictionBar, MetricTile, fmtNum } from "./primitives";
import { DimensionGrid } from "./PhaseViews";
import { DeepSections, DosDonts, PrioritizedFixList } from "./report-sections";
import type { AuditReport, PRFunnel, FrictionFingerprint } from "./types";
import { SlidersHorizontal } from "lucide-react";

interface FunnelTileConfig {
  key: string;
  label: string;
  value: string;
  color: "emerald" | "rose" | "sky" | "purple";
  note: string;
}

function buildFunnelTiles(pf: PRFunnel): FunnelTileConfig[] {
  return [
    { key: "merge", label: "Outside Merge Rate", value: `${pf.merge_rate.toFixed(1)}%`, color: "emerald", note: "of all submitted PRs" },
    { key: "abandon", label: "PR Abandonment", value: `${pf.abandonment_rate.toFixed(1)}%`, color: "rose", note: "closed without merge" },
    { key: "first_timer", label: "First-Timer Merge", value: `${pf.first_timer_success_rate.toFixed(1)}%`, color: "sky", note: "newcomer success rate" },
    { key: "repeat", label: "Repeat Contributor", value: `${pf.repeat_contributor_rate.toFixed(1)}%`, color: "purple", note: "came back for more" },
  ];
}

interface FrictionBarConfig {
  key: "style" | "tests" | "scope";
  label: string;
  pct: number;
  color: "rose" | "amber" | "sky";
}

function buildFrictionBars(ff: FrictionFingerprint): FrictionBarConfig[] {
  return [
    { key: "style", label: "Code Style & Lint Nitpicks", pct: ff.formatting_and_style_pct, color: "rose" },
    { key: "tests", label: "Missing Tests & CI Breakages", pct: ff.missing_tests_and_ci_pct, color: "amber" },
    { key: "scope", label: "Scope & Architecture Discussion", pct: ff.scope_and_spec_pct, color: "sky" },
  ];
}

function impactBadgeClass(impact: string): string {
  return impact === "Critical"
    ? "bg-rose-950/80 text-rose-300 border border-rose-800"
    : impact === "High"
    ? "bg-amber-950/80 text-amber-300 border border-amber-800"
    : "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function statusBadgeClass(status: string): string {
  return status === "Bottleneck"
    ? "bg-rose-950 text-rose-400 border border-rose-800"
    : status === "Needs Attention"
    ? "bg-amber-950 text-amber-400 border border-amber-800"
    : status === "Exceptional"
    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
    : "bg-emerald-950/60 text-emerald-400 border border-emerald-900";
}

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
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(key);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

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

  const vitals = useMemo(() => {
    if (!rh) return [];
    return [
      { key: "response", Icon: Clock, iconClass: "text-amber-400", label: "First response", value: `${rh.time_to_first_response_h.toFixed(1)}h` },
      { key: "merge", Icon: GitMerge, iconClass: "text-emerald-400", label: "Merge rate", value: pf ? `${pf.merge_rate.toFixed(1)}%` : " - " },
      { key: "reviewers", Icon: Users, iconClass: "text-sky-400", label: "Active reviewers", value: `${rh.distinct_maintainers}` },
      { key: "rounds", Icon: GitPullRequest, iconClass: "text-purple-400", label: "Avg review rounds", value: `${rh.avg_review_rounds.toFixed(1)}` },
    ];
  }, [rh, pf]);

  const reviewerRows = useMemo(() => {
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
        valueClass: `text-right max-w-[160px] ${isReviewerConcentrated ? "text-rose-400" : "text-zinc-300"}`,
      },
    ];
  }, [rh, avgResponseH, isReviewerConcentrated]);

  const vibeScores = useMemo(() => {
    const scores = [];
    if (r.ai_insights.warmth_score > 0) {
      scores.push({ key: "warmth", label: "Warmth Score", value: r.ai_insights.warmth_score, valueClass: "text-rose-300", barClass: "bg-rose-500/70" });
    }
    if (r.ai_insights.patience_score > 0) {
      scores.push({ key: "patience", label: "Patience Score", value: r.ai_insights.patience_score, valueClass: "text-sky-300", barClass: "bg-sky-500/70" });
    }
    return scores;
  }, [r.ai_insights]);

  const templateCards = useMemo(() => {
    if (!r.actionable_templates) return [];
    return [
      { key: "pr_template", filename: ".github/pull_request_template.md", text: r.actionable_templates.pull_request_template },
      { key: "contributing", filename: "CONTRIBUTING.md (Review SLA section)", text: r.actionable_templates.contributing_guide },
    ];
  }, [r.actionable_templates]);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-block rounded-full bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 font-mono text-xs font-bold text-emerald-300">
                ✓ Maintainer Intelligence Report
              </span>
              {r.overall.potential_uplift_pts && r.overall.potential_uplift_pts > 0 ? (
                <span className="inline-block rounded-full bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 font-mono text-xs font-bold text-indigo-300">
                  +{r.overall.potential_uplift_pts.toFixed(1)} pts potential
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white">{r.repo.full_name}</h1>
            {r.repo.description && <p className="text-sm text-zinc-300 mt-1 max-w-2xl">{r.repo.description}</p>}

            {/* Quick vitals inline */}
            {rh && (
              <div className="flex flex-wrap gap-4 mt-4">
                {vitals.map(({ key, Icon, iconClass, label, value }) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs font-mono">
                    <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
                    <span className="text-zinc-400">{label}</span>
                    <span className="text-white font-bold">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400">{r.overall.score.toFixed(1)}</div>
              <div className="text-xs font-mono text-zinc-400 font-semibold">C-Rank™ · Tier {r.overall.tier}</div>
            </div>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/[0.1] px-4 py-2.5 text-xs font-mono font-bold text-white transition-all cursor-pointer shadow-sm"
              title="Download standalone offline HTML report"
            >
              <Download className="h-4 w-4 text-sky-400" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── TOP PRIORITY SIGNAL ── show the #1 thing to act on */}
      {topBottleneck && (
        <section className="rounded-2xl border-2 border-amber-500/30 bg-amber-950/20 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-500/30">
              <Target className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-mono font-bold text-amber-300 mb-0.5">Top Priority This Week</p>
              <p className="text-sm font-mono text-white font-bold">{topBottleneck.label}</p>
              <p className="text-xs text-zinc-400 mt-1">
                Currently at the <span className="text-amber-300 font-bold">{topBottleneck.peer_percentile.toFixed(0)}th percentile</span> among peers - {" "}
                {topBottleneck.simulated_uplift > 0
                  ? `fixing this could add +${topBottleneck.simulated_uplift.toFixed(1)} pts to your C-Rank™`
                  : `this is your biggest drag on contributor experience`}.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── PR FUNNEL ── */}
      {pf && (
        <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-white mb-4">
            <TrendingUp className="h-4 w-4 text-emerald-400" /> PR Acceptance & Drop-off Funnel
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {funnelTiles.map((t) => (
              <MetricTile key={t.key} label={t.label} value={t.value} color={t.color} note={t.note} />
            ))}
          </div>

          {/* First-timer insight */}
          {ghostRate !== null && (
            <div className={`rounded-xl border p-3.5 ${ghostRate > 50 ? "border-rose-800/60 bg-rose-950/20" : "border-white/[0.06] bg-black/20"}`}>
              <p className="text-xs font-mono text-zinc-300">
                <span className="font-bold text-white">First-Timer Journey: </span>
                {pf.first_timer_success_rate.toFixed(0)}% of newcomers get merged. Of those who don&apos;t,{" "}
                {ghostRate > 50
                  ? <span className="text-rose-400 font-bold">most never return</span>
                  : <span className="text-amber-300">some return but struggle to close</span>
                }. {ghostRate > 50
                  ? "Consider a welcome bot and explicit \"good first issue\" labeling to reduce ghost rate."
                  : "Your newcomer conversion is solid - focus on improving the merge timeline."
                }
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── REVIEWER HEALTH + BURNOUT SIGNAL ── */}
      {(rh || ff) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {rh && (
            <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-white mb-3">
                <Users className="h-4 w-4 text-sky-400" /> Reviewer Team Health
              </h2>
              <div className="space-y-2.5 text-xs font-mono mb-4">
                {reviewerRows.map((row, i) => (
                  <div
                    key={row.key}
                    className={`flex justify-between items-center ${i < reviewerRows.length - 1 ? "border-b border-white/[0.06] pb-2" : "pb-1"}`}
                  >
                    <span className="text-zinc-400">{row.label}</span>
                    <span className={`font-bold ${row.valueClass}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Burnout signal */}
              {isReviewerConcentrated && (
                <div className="rounded-xl border border-rose-800/50 bg-rose-950/25 p-3">
                  <p className="text-[11px] font-mono text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5 inline mr-1 mb-0.5" />
                    <span className="font-bold">Burnout Risk:</span>{" "}
                    {rh.bus_factor <= 1
                      ? "A single reviewer is your entire bottleneck. If they step back, PRs stall."
                      : "Small core team - consider explicitly mentoring 1-2 contributors toward reviewer status."
                    }
                  </p>
                </div>
              )}
            </section>
          )}

          {ff && (
            <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-white mb-3">
                <ShieldAlert className="h-4 w-4 text-rose-400" /> Review Friction Breakdown
              </h2>
              <div className="space-y-3 mb-4">
                {frictionBars.map((b) => (
                  <FrictionBar key={b.key} label={b.label} pct={b.pct} color={b.color} />
                ))}
              </div>
              {/* Friction insight */}
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <p className="text-[11px] font-mono text-zinc-300">
                  {ff.formatting_and_style_pct >= 40
                    ? <>
                        <span className="font-bold text-white">Quick win:</span>{" "}
                        {ff.formatting_and_style_pct.toFixed(0)}% of review friction is style/lint - a shared <span className="text-sky-400">.editorconfig</span> or pre-commit hook eliminates most of it without any human review cost.
                      </>
                    : ff.missing_tests_and_ci_pct >= 35
                    ? <>
                        <span className="font-bold text-white">Quick win:</span>{" "}
                        {ff.missing_tests_and_ci_pct.toFixed(0)}% of friction is missing tests. A required CI status check blocks this category before it reaches review.
                      </>
                    : <>
                        <span className="font-bold text-white">Architectural discussions</span> dominate your review friction - consider RFC or proposal templates for large changes.
                      </>
                  }
                </p>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── MAINTAINER VIBE ── */}
      {(r.ai_insights.maintainer_vibe || r.ai_insights.maintainer_persona) && (
        <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-white mb-4">
            <Heart className="h-4 w-4 text-rose-400" /> Maintainer Vibe & Community Warmth
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {r.ai_insights.maintainer_persona && (
              <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 sm:col-span-1">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Persona</p>
                <p className="text-sm font-bold font-mono text-white">{r.ai_insights.maintainer_persona}</p>
              </div>
            )}
            {vibeScores.map((s) => (
              <div key={s.key} className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold font-mono ${s.valueClass}`}>{s.value.toFixed(0)}</span>
                  <span className="text-xs text-zinc-500">/100</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800 mt-2 overflow-hidden">
                  <div className={`h-full ${s.barClass}`} style={{ width: `${s.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          {r.ai_insights.maintainer_vibe && (
            <p className="text-sm text-zinc-300 italic border-l-2 border-emerald-500/40 pl-4">
              &ldquo;{r.ai_insights.maintainer_vibe}&rdquo;
            </p>
          )}
        </section>
      )}

      {/* ── PER-FACTOR BENCHMARK ── */}
      <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-white mb-4">
          <Sparkles className="h-4 w-4 text-indigo-400" /> 10-Dimension Ecosystem Benchmark (500+ Peers)
        </h2>
        <div className="space-y-3">
          {r.factors.map((f) => (
            <div key={f.key} className="rounded-xl border border-white/[0.08] p-3.5 bg-black/30">
              <div className="flex items-center justify-between text-xs font-mono mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{f.label}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${impactBadgeClass(f.impact_level)}`}>
                    {f.impact_level} Impact
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(f.status)}`}>
                    {f.status}
                  </span>
                  <span className="text-sky-400 font-bold font-mono">
                    {f.peer_percentile.toFixed(0)}th percentile
                  </span>
                </div>
              </div>

              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden mb-2">
                <div
                  className={`h-full ${
                    f.peer_percentile >= 75 ? "bg-emerald-500" : f.peer_percentile >= 40 ? "bg-amber-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.max(5, Math.min(100, f.peer_percentile))}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400">
                <span>Observed value: {fmtNum(f.raw_value)}</span>
                {f.simulated_uplift > 0 ? (
                  <span className="text-emerald-400 font-bold font-mono">
                    Potential uplift: +{f.simulated_uplift.toFixed(1)} pts
                  </span>
                ) : (
                  <span className="text-zinc-500">Operating at target</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI PRIORITIZED FIXES ── */}
      <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-white">
            <Sparkles className="h-4 w-4 text-emerald-400" /> AI Remediation Punchlist
          </h2>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-[11px] font-mono font-bold text-zinc-200 shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${regenLoading ? "animate-spin" : ""}`} />
              {regenLoading ? "Regenerating…" : "Regenerate (1/day)"}
            </button>
          )}
        </div>

        {regenNote && <p className="text-[11px] text-zinc-300 mb-3">{regenNote}</p>}

        <PrioritizedFixList fixes={r.prioritized_fixes} />
      </section>

      {/* ── DOS & DON'TS ── */}
      <DosDonts dos={r.ai_insights.top_dos ?? []} donts={r.ai_insights.top_donts ?? []} />

      {/* ── DEEP SECTIONS ── */}
      {r.ai_insights.deep_sections?.length > 0 && (
        <DeepSections sections={r.ai_insights.deep_sections} />
      )}

      {/* ── READY-TO-COPY GITHUB PATCHES ── */}
      {r.actionable_templates && (
        <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-white mb-2">
            <Copy className="h-4 w-4 text-purple-400" /> Ready-to-Commit GitHub Templates
          </h2>
          <p className="text-xs text-zinc-400 mb-4">
            Copy and commit these directly to your repo to reduce friction today.
          </p>

          <div className="space-y-4">
            {templateCards.map((t) => (
              <div key={t.key} className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono font-bold text-zinc-300">{t.filename}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(t.key, t.text)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 hover:text-sky-300 bg-sky-950/60 border border-sky-800/60 rounded px-2.5 py-1 transition-all cursor-pointer"
                  >
                    {copiedTemplate === t.key ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedTemplate === t.key ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap bg-zinc-950/80 p-3 rounded-lg border border-white/[0.05] overflow-x-auto">
                  {t.text}
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 10-DIMENSION DIAGNOSTIC COVERAGE ── */}
      <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-extrabold font-mono text-white flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
              10-Dimension Maintainer Intelligence Suite
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Comprehensive scan vectors analyzed using GitHub GraphQL & Maintainer Tokens
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md">
            10 of 10 Dimensions Active
          </span>
        </div>

        <DimensionGrid />
      </section>
    </div>
  );
}
