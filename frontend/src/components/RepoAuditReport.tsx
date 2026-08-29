"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileSearch,
  Lock,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
  ExternalLink,
  Copy,
  Check,
  TrendingUp,
  Users,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import {
  API_BASE_URL,
  getRepoApiUrl,
  getRepoQueryUrl,
  getRepoAuditUrl,
  getRepoAuditCheckoutUrl,
  getRepoAuditRegenUrl,
  getRepoAuditStatusUrl,
} from "@/lib/api";
import { generateAuditHtml } from "@/lib/exportAuditHtml";

export interface AuditFactor {
  key: string;
  label: string;
  raw_value: number;
  normalized_score: number;
  peer_percentile: number;
  impact_level: "Critical" | "High" | "Moderate" | "Minor" | string;
  status: "Bottleneck" | "Needs Attention" | "Healthy" | "Exceptional" | string;
  simulated_uplift: number;
}

export interface PRFunnel {
  merge_rate: number;
  abandonment_rate: number;
  repeat_contributor_rate: number;
  first_timer_success_rate: number;
}

export interface ReviewerHealth {
  distinct_maintainers: number;
  bus_factor: number;
  avg_review_rounds: number;
  time_to_first_response_h: number;
  time_to_merge_h: number;
  concentration_risk: string;
}

export interface FrictionFingerprint {
  formatting_and_style_pct: number;
  missing_tests_and_ci_pct: number;
  scope_and_spec_pct: number;
}

export interface ActionableTemplates {
  pull_request_template: string;
  contributing_guide: string;
}

export interface DeepSection {
  title: string;
  body: string;
}

export interface AuditAIInsights {
  maintainer_vibe: string | null;
  maintainer_persona: string | null;
  warmth_score: number;
  patience_score: number;
  nitpick_ratio: number;
  top_dos: string[];
  top_donts: string[];
  deep_sections: DeepSection[];
}

export interface PrioritizedFix {
  priority: number;
  type: string;
  text?: string;
  title?: string;
}

export interface AuditReport {
  repo: {
    full_name: string;
    language: string | null;
    stars: number;
    description: string | null;
    c_rank_score: number;
    c_rank_tier: string;
  };
  overall: {
    score: number;
    tier: string;
    potential_uplift_pts?: number;
  };
  factors: AuditFactor[];
  pr_funnel?: PRFunnel;
  reviewer_health?: ReviewerHealth;
  friction_fingerprint?: FrictionFingerprint;
  actionable_templates?: ActionableTemplates;
  ai_insights: AuditAIInsights;
  prioritized_fixes: PrioritizedFix[];
}

type Phase = "checking" | "unauth" | "report" | "pay" | "notfound" | "error";

interface RepoAuditReportProps {
  owner: string;
  name: string;
  fullName: string;
}

const POLL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

export function RepoAuditReport({ owner, name, fullName }: RepoAuditReportProps) {
  const repoKey = fullName.toLowerCase();
  const [phase, setPhase] = useState<Phase>("checking");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [regenNote, setRegenNote] = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineRef = useRef<number>(0);

  const fetchReport = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(getRepoAuditUrl(owner, name), {
        credentials: "include",
      });
      if (res.status === 403) return false;
      if (res.status === 404) {
        return false;
      }
      if (!res.ok) {
        setErrorMsg("Failed to load audit report.");
        setPhase("error");
        return true;
      }
      const data = (await res.json()) as AuditReport;
      setReport(data);
      setPhase("report");
      return true;
    } catch {
      setErrorMsg("Network error loading audit report.");
      setPhase("error");
      return true;
    }
  }, [owner, name]);

  const pollStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(getRepoAuditStatusUrl(repoKey), {
        credentials: "include",
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { status?: string };
      return data.status === "paid";
    } catch {
      return false;
    }
  }, [repoKey]);

  const startPolling = useCallback(() => {
    deadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
    const tick = async () => {
      if (Date.now() > deadlineRef.current) return;
      const paid = await pollStatus();
      if (paid) {
        await fetchReport();
        return;
      }
      pollRef.current = setTimeout(tick, POLL_MS);
    };
    pollRef.current = setTimeout(tick, POLL_MS);
  }, [pollStatus, fetchReport]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Auth check (AC4/AC5): unauthenticated viewers cannot view the report.
      try {
        const me = await fetch(`${API_BASE_URL}/api/v1/auth/me`, { credentials: "include" });
        if (!me.ok) {
          if (!cancelled) setPhase("unauth");
          return;
        }
      } catch {
        if (!cancelled) setPhase("unauth");
        return;
      }
      const loaded = await fetchReport();
      if (cancelled) return;
      if (!loaded) {
        // Check if repo exists in opendoor DB first
        try {
          const repoCheck = await fetch(getRepoApiUrl(fullName));
          if (!repoCheck.ok && repoCheck.status === 404) {
            const searchCheck = await fetch(getRepoQueryUrl(fullName));
            if (searchCheck.ok) {
              const data = await searchCheck.json();
              const list = data.data || data.repos || [];
              const exists = Array.isArray(list) && list.some((r: { full_name?: string }) => r.full_name?.toLowerCase() === fullName.toLowerCase());
              if (!exists) {
                setPhase("notfound");
                return;
              }
            } else {
              setPhase("notfound");
              return;
            }
          }
        } catch {}

        setPhase("pay");
        startPolling();
      }
    })();
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [fetchReport, startPolling, owner, name, fullName]);

  const startCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(getRepoAuditCheckoutUrl(owner, name), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        setErrorMsg("Could not start checkout. Please try again.");
        setCheckoutLoading(false);
        return;
      }
      const data = (await res.json()) as { checkout_url?: string };
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setErrorMsg("Checkout unavailable right now.");
      setCheckoutLoading(false);
    } catch {
      setErrorMsg("Network error starting checkout.");
      setCheckoutLoading(false);
    }
  }, [owner, name]);

  const regenerate = useCallback(async () => {
    if (!report) return;
    setRegenLoading(true);
    setRegenNote(null);
    try {
      const res = await fetch(getRepoAuditRegenUrl(owner, name), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        setRegenNote("Could not regenerate insights.");
        return;
      }
      const data = (await res.json()) as {
        regenerated: boolean;
        reason?: string;
        insights?: AuditAIInsights;
      };
      if (data.insights) {
        setReport((prev) =>
          prev ? { ...prev, ai_insights: data.insights as AuditAIInsights } : prev
        );
      }
      if (data.reason === "rate_limited") {
        setRegenNote("AI insights regenerate is limited to once per day - showing your cached report.");
      } else if (data.regenerated) {
        setRegenNote("AI insights regenerated.");
      }
    } catch {
      setRegenNote("Could not regenerate insights.");
    } finally {
      setRegenLoading(false);
    }
  }, [owner, name, report]);

  if (phase === "checking") {
    return <AuditShell fullName={fullName}><p className="text-sm text-zinc-300">Loading diagnostic report…</p></AuditShell>;
  }

  if (phase === "unauth") {
    return (
      <AuditShell fullName={fullName}>
        <div className="rounded-2xl border-2 border-white/[0.1] glass-panel p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-950/80 border-amber-800/80 border border-amber-200 text-amber-600">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold font-mono text-white mb-2">Sign in to view the Deep-Audit</h1>
          <p className="text-sm text-zinc-300 mb-6 max-w-md mx-auto">
            The deep-audit diagnostic is tied to your maintainer account. Sign in to unlock the full ecosystem benchmarking, PR funnel breakdown, and AI remediation plan.
          </p>
          <a
            href={`${API_BASE_URL}/api/v1/auth/github`}
            className="inline-flex items-center gap-2 rounded-full glass-card px-6 py-3 text-xs font-mono font-bold text-white hover:bg-zinc-800 transition-all"
          >
            <Lock className="h-4 w-4" /> Sign in with GitHub
          </a>
        </div>
      </AuditShell>
    );
  }

  if (phase === "notfound") {
    return (
      <AuditShell fullName={fullName}>
        <div className="rounded-2xl border-2 border-white/[0.1] glass-panel p-8 text-center">
          <h1 className="text-xl font-bold text-white">Repository not found</h1>
          <p className="text-sm text-zinc-300 mt-2">This repository is not indexed yet.</p>
        </div>
      </AuditShell>
    );
  }

  if (phase === "error") {
    return (
      <AuditShell fullName={fullName}>
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-950/70 border-rose-800/80 p-8 text-center">
          <AlertCircle className="h-7 w-7 mx-auto text-rose-600 mb-3" />
          <h1 className="text-xl font-bold text-white">Something went wrong</h1>
          <p className="text-sm text-zinc-300 mt-2">{errorMsg}</p>
        </div>
      </AuditShell>
    );
  }

  if (phase === "pay") {
    return (
      <AuditShell fullName={fullName}>
        <div className="space-y-6">
          {/* Hero Paywall Card */}
          <div className="rounded-2xl border-2 border-white/[0.1] glass-panel p-8 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/20 border-2 border-white/[0.1] text-amber-400 -rotate-2">
              <FileSearch className="h-7 w-7" />
            </div>
            
            <span className="inline-block rounded-full bg-amber-950/60 border border-amber-500/30 px-3 py-1 font-mono text-xs font-bold text-amber-300 mb-3">
              $19 · One-Time Maintainer Diagnostic
            </span>
            
            <h1 className="text-2xl font-bold font-mono text-white mb-2">
              Full Deep-Audit for {fullName}
            </h1>
            
            <p className="text-sm text-zinc-300 mb-6 max-w-xl mx-auto leading-relaxed">
              Uncover outside contributor drop-off, review turnaround bottlenecks, review friction patterns, and get ready-to-copy GitHub templates to elevate your maintainer score.
            </p>

            {errorMsg && <p className="text-xs text-rose-400 mb-3">{errorMsg}</p>}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={startCheckout}
                disabled={checkoutLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#ffd93d] px-7 py-3.5 text-xs font-mono font-bold text-black shadow-lg transition-all hover:bg-[#ffdf5c] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                <FileSearch className="h-4 w-4" />
                {checkoutLoading ? "Redirecting to checkout…" : `Unlock Deep-Audit for $19`}
              </button>

              <Link
                href="/audit/sample"
                target="_blank"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full glass-card border border-white/[0.15] px-6 py-3.5 text-xs font-mono font-bold text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-all"
              >
                <ExternalLink className="h-4 w-4 text-sky-400" />
                View Sample Report (Live HTML Demo)
              </Link>
            </div>

            <p className="text-[11px] text-zinc-400">
              ⚡ Instant unlock upon checkout · Exportable offline HTML · No recurring subscription.
            </p>
          </div>

          {/* Teaser Diagnostic Preview Matrix */}
          <div className="rounded-2xl border border-white/[0.1] glass-panel p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-bold font-mono text-zinc-200 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                Diagnostic Scope Preview
              </h2>
              <span className="text-xs font-mono text-zinc-400">5 Pillars of Health</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/[0.08] p-4 bg-black/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> PR Abandonment & Drop-off Funnel
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded">Locked</span>
                </div>
                <p className="text-[12px] text-zinc-400">
                  Exact % drop-off between PR submission, review iterations, and merge vs abandonment.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] p-4 bg-black/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-sky-400" /> Reviewer Concentration & Bus Factor
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded">Locked</span>
                </div>
                <p className="text-[12px] text-zinc-400">
                  Single-maintainer burnout risks and turnaround distribution across active reviewers.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] p-4 bg-black/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-400" /> Review Comment Friction Fingerprint
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded">Locked</span>
                </div>
                <p className="text-[12px] text-zinc-400">
                  Categorized breakdown of review comments: lint/style nitpicks vs missing tests vs architecture.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] p-4 bg-black/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" /> 1-Click Tailored GitHub Patches
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded">Locked</span>
                </div>
                <p className="text-[12px] text-zinc-400">
                  Pre-built `.github/pull_request_template.md` and CONTRIBUTING guidelines to fix your top bottlenecks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AuditShell>
    );
  }

  // phase === "report"
  const r = report as AuditReport;
  return (
    <AuditShell fullName={fullName}>
      <AuditReportContent report={r} onRegenerate={regenerate} regenLoading={regenLoading} regenNote={regenNote} />
    </AuditShell>
  );
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

  return (
    <div className="space-y-8">
      {/* Summary Header */}
      <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-block rounded-full bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 font-mono text-xs font-bold text-emerald-300">
                Verified Deep-Audit Report
              </span>
              {r.overall.potential_uplift_pts && r.overall.potential_uplift_pts > 0 ? (
                <span className="inline-block rounded-full bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 font-mono text-xs font-bold text-indigo-300">
                  +{r.overall.potential_uplift_pts.toFixed(1)} pts simulated potential
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white">{r.repo.full_name}</h1>
            {r.repo.description && <p className="text-sm text-zinc-300 mt-1 max-w-2xl">{r.repo.description}</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400">{r.overall.score.toFixed(1)}</div>
              <div className="text-xs font-mono text-zinc-400 font-semibold">C-Rank · Tier {r.overall.tier}</div>
            </div>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/[0.1] px-4 py-2.5 text-xs font-mono font-bold text-white transition-all cursor-pointer shadow-sm"
              title="Download standalone offline HTML report"
            >
              <Download className="h-4 w-4 text-sky-400" />
              <span>Export HTML</span>
            </button>
          </div>
        </div>
      </section>

      {/* PR Funnel & Abandonment Drop-off */}
      {r.pr_funnel && (
        <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-white mb-4">
            <TrendingUp className="h-4 w-4 text-emerald-400" /> PR Acceptance & Drop-off Funnel
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/[0.08] p-4 bg-black/40">
              <div className="text-2xl font-bold font-mono text-white">{r.pr_funnel.merge_rate.toFixed(1)}%</div>
              <div className="text-xs text-zinc-400 mt-1 font-medium">Outside Merge Rate</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] p-4 bg-black/40">
              <div className="text-2xl font-bold font-mono text-rose-400">{r.pr_funnel.abandonment_rate.toFixed(1)}%</div>
              <div className="text-xs text-zinc-400 mt-1 font-medium">PR Abandonment Rate</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] p-4 bg-black/40">
              <div className="text-2xl font-bold font-mono text-sky-400">{r.pr_funnel.first_timer_success_rate.toFixed(1)}%</div>
              <div className="text-xs text-zinc-400 mt-1 font-medium">First-Timer Merge Rate</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] p-4 bg-black/40">
              <div className="text-2xl font-bold font-mono text-purple-400">{r.pr_funnel.repeat_contributor_rate.toFixed(1)}%</div>
              <div className="text-xs text-zinc-400 mt-1 font-medium">Repeat Contributor Rate</div>
            </div>
          </div>
        </section>
      )}

      {/* Reviewer Concentration & Friction Fingerprint */}
      {(r.reviewer_health || r.friction_fingerprint) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {r.reviewer_health && (
            <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-white mb-3">
                <Users className="h-4 w-4 text-sky-400" /> Reviewer Team Health
              </h2>
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                  <span className="text-zinc-400">Active Maintainers</span>
                  <span className="text-white font-bold">{r.reviewer_health.distinct_maintainers} reviewers</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                  <span className="text-zinc-400">Bus Factor</span>
                  <span className="text-white font-bold">{r.reviewer_health.bus_factor}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                  <span className="text-zinc-400">First-Response Time</span>
                  <span className="text-white font-bold">{r.reviewer_health.time_to_first_response_h.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-zinc-400">Team Concentration</span>
                  <span className="text-amber-400 font-bold">{r.reviewer_health.concentration_risk}</span>
                </div>
              </div>
            </section>
          )}

          {r.friction_fingerprint && (
            <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-white mb-3">
                <ShieldAlert className="h-4 w-4 text-rose-400" /> Review Friction Breakdown
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-zinc-300">Code Style & Lint Nitpicks</span>
                    <span className="text-rose-400 font-bold">{r.friction_fingerprint.formatting_and_style_pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${r.friction_fingerprint.formatting_and_style_pct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-zinc-300">Missing Tests & CI Breakages</span>
                    <span className="text-amber-400 font-bold">{r.friction_fingerprint.missing_tests_and_ci_pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${r.friction_fingerprint.missing_tests_and_ci_pct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-zinc-300">Scope & Architecture Discussion</span>
                    <span className="text-sky-400 font-bold">{r.friction_fingerprint.scope_and_spec_pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-sky-500" style={{ width: `${r.friction_fingerprint.scope_and_spec_pct}%` }} />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Per-factor Ecosystem Benchmark Breakdown */}
      <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-white mb-4">
          <Sparkles className="h-4 w-4 text-indigo-400" /> Ecosystem Benchmark & Diagnostics (500+ Peers)
        </h2>
        <div className="space-y-3">
          {r.factors.map((f) => (
            <div key={f.key} className="rounded-xl border border-white/[0.08] p-3.5 bg-black/30">
              <div className="flex items-center justify-between text-xs font-mono mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{f.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      f.impact_level === "Critical"
                        ? "bg-rose-950/80 text-rose-300 border border-rose-800"
                        : f.impact_level === "High"
                        ? "bg-amber-950/80 text-amber-300 border border-amber-800"
                        : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    }`}
                  >
                    {f.impact_level} Impact
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      f.status === "Bottleneck"
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : f.status === "Needs Attention"
                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                        : f.status === "Exceptional"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : "bg-emerald-950/60 text-emerald-400 border border-emerald-900"
                    }`}
                  >
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

      {/* AI-prioritized fixes */}
      <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-white">
            <Sparkles className="h-4 w-4 text-emerald-400" /> AI-Prioritized Remediation Punchlist
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

        {r.prioritized_fixes.length === 0 ? (
          <p className="text-xs text-zinc-400">No prioritized fixes available yet.</p>
        ) : (
          <ol className="space-y-2.5">
            {r.prioritized_fixes.map((fix) => (
              <li key={fix.priority} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-black/40 p-3.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-white font-mono">
                  {fix.priority}
                </span>
                <div className="text-xs text-zinc-200">
                  {fix.type === "avoid" ? (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-400"><XCircle className="h-3.5 w-3.5" /> Avoid:</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-sky-400"><CheckCircle2 className="h-3.5 w-3.5" /> {fix.title}:</span>
                  )}{" "}
                  <span className="leading-relaxed">{fix.text}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 1-Click Tailored GitHub Configuration Patches */}
      {r.actionable_templates && (
        <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-white mb-2">
            <Copy className="h-4 w-4 text-purple-400" /> Tailored GitHub Configuration Patches
          </h2>
          <p className="text-xs text-zinc-400 mb-4">
            Copy and commit these configuration snippets directly to your repository to accelerate review turnaround.
          </p>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-bold text-zinc-300">.github/pull_request_template.md</span>
                <button
                  type="button"
                  onClick={() => handleCopy("pr_template", r.actionable_templates!.pull_request_template)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 hover:text-sky-300 bg-sky-950/60 border border-sky-800/60 rounded px-2.5 py-1 transition-all cursor-pointer"
                >
                  {copiedTemplate === "pr_template" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedTemplate === "pr_template" ? "Copied" : "Copy Template"}
                </button>
              </div>
              <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap bg-zinc-950/80 p-3 rounded-lg border border-white/[0.05] overflow-x-auto">
                {r.actionable_templates.pull_request_template}
              </pre>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-bold text-zinc-300">CONTRIBUTING.md (Review SLA section)</span>
                <button
                  type="button"
                  onClick={() => handleCopy("contributing", r.actionable_templates!.contributing_guide)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 hover:text-sky-300 bg-sky-950/60 border border-sky-800/60 rounded px-2.5 py-1 transition-all cursor-pointer"
                >
                  {copiedTemplate === "contributing" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedTemplate === "contributing" ? "Copied" : "Copy Guide"}
                </button>
              </div>
              <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap bg-zinc-950/80 p-3 rounded-lg border border-white/[0.05] overflow-x-auto">
                {r.actionable_templates.contributing_guide}
              </pre>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function fmtNum(v: number): string {
  if (v >= 100) return v.toFixed(0);
  if (v >= 1) return v.toFixed(1);
  return v.toFixed(2);
}

function AuditShell({ fullName, children }: { fullName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-transparent overflow-x-hidden">
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <Link
          href={`/${fullName}`}
          title="Back to repository"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-300 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {fullName}
        </Link>
        {children}
      </main>
    </div>
  );
}
