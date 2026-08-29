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
  Clock,
  GitMerge,
  GitPullRequest,
  AlertTriangle,
  BarChart3,
  Zap,
  Heart,
  Target,
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

type Phase = "checking" | "unauth" | "report" | "pay" | "notfound" | "error" | "analyzing";

interface RepoAuditReportProps {
  owner: string;
  name: string;
  fullName: string;
}

const POLL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

// The 10 analysis dimensions shown during the animated progress phase
const ANALYSIS_STEPS = [
  { key: "pr_funnel", label: "PR Lifecycle Funnel", icon: "📊", durationMs: 900, badge: "Live", description: "Full 90-day PR journey: opened → reviewed → merged or abandoned. Exact drop-off at each stage." },
  { key: "first_timer", label: "First-Timer Journey", icon: "🌱", durationMs: 1100, badge: "Live", description: "Newcomer merge rate, ghost rate, and how many first-timers become repeat contributors." },
  { key: "reviewer_load", label: "Reviewer Load Distribution", icon: "⚖️", durationMs: 1300, badge: "Live", description: "Which reviewers carry 70%+ of the load? Early burnout warning before someone quietly disappears." },
  { key: "stale_prs", label: "Stale PR Graveyard", icon: "🕰️", durationMs: 800, badge: "Actionable", description: "Open PRs older than 30 days, each with a suggested action: merge it, close it, or just comment." },
  { key: "review_quality", label: "Review Comment Quality", icon: "🔬", durationMs: 1200, badge: "Live", description: "Nitpick vs blocking vs architectural ratio. Are reviews helping contributors or just slowing them down?" },
  { key: "retention", label: "Contributor Retention Curve", icon: "📈", durationMs: 1000, badge: "Live", description: "Month-over-month cohort view of who keeps contributing vs who ghosts after their first PR." },
  { key: "activity_patterns", label: "Activity Time Patterns", icon: "🗓️", durationMs: 700, badge: "Live", description: "Hour-of-day and day-of-week breakdown. When do PRs get reviewed fastest? Tell your contributors." },
  { key: "issue_conversion", label: "Issue-to-PR Conversion", icon: "🎯", durationMs: 900, badge: "Live", description: "Of your good-first-issues, how many actually get a PR? Identify which labels and titles convert." },
  { key: "velocity_trend", label: "Merge Velocity Trend", icon: "🚀", durationMs: 1100, badge: "Live", description: "Month-over-month merge rate. Is momentum building or quietly stalling? Catch it before it flatlines." },
  { key: "peer_benchmark", label: "Peer Ecosystem Benchmark", icon: "🏆", durationMs: 1400, badge: "Live", description: "All 9 C-Rank™ factors scored against 500+ peer repositories. Know exactly where you stand." },
];

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
        // Show animated analysis before revealing report
        setPhase("analyzing");
        return;
      }
      pollRef.current = setTimeout(tick, POLL_MS);
    };
    pollRef.current = setTimeout(tick, POLL_MS);
  }, [pollStatus]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Auth check: unauthenticated viewers cannot view the report.
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
        const data = await res.json().catch(() => ({})) as { error?: string };
        if (data.error === "not_maintainer") {
          setErrorMsg("You need to be an admin maintainer of this repository to purchase an audit.");
        } else {
          setErrorMsg("Could not start checkout. Please try again.");
        }
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
          <h1 className="text-xl font-bold font-mono text-white mb-2">Sign in to view the Maintainer Audit</h1>
          <p className="text-sm text-zinc-300 mb-6 max-w-md mx-auto">
            Maintainer audits are tied to verified repo admins. Sign in with GitHub to continue.
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

  if (phase === "analyzing") {
    return (
      <AuditShell fullName={fullName}>
        <AuditAnalyzingView fullName={fullName} onComplete={fetchReport} />
      </AuditShell>
    );
  }

  if (phase === "pay") {
    return (
      <AuditShell fullName={fullName}>
        <div className="space-y-6">
          {/* Hero Paywall Card */}
          <div className="rounded-2xl border-2 border-white/[0.1] glass-panel p-8 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-40 h-40 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 transform -translate-x-4 translate-y-4 w-32 h-32 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 border-2 border-emerald-500/30 text-emerald-400 -rotate-2">
              <FileSearch className="h-7 w-7" />
            </div>

            <span className="inline-block rounded-full bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 font-mono text-xs font-bold text-emerald-300 mb-3">
              $10 · One-Time · Maintainer Intelligence Report
            </span>

            <h1 className="text-2xl font-bold font-mono text-white mb-2">
              Deep Audit for {fullName}
            </h1>

            <p className="text-sm text-zinc-300 mb-2 max-w-xl mx-auto leading-relaxed">
              10-dimension live analysis using your GitHub token. Stale PR triage, reviewer burnout signals,
              contributor retention curves, and ready-to-copy GitHub templates — generated for you, not at you.
            </p>

            {/* Mini dimension grid teaser */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-lg mx-auto">
              {ANALYSIS_STEPS.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900/60 border border-white/[0.06] px-2 py-0.5 rounded-md">
                  <span>{s.icon}</span> {s.label}
                </span>
              ))}
            </div>

            {errorMsg && <p className="text-xs text-rose-400 mb-3">{errorMsg}</p>}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
              <button
                type="button"
                onClick={startCheckout}
                disabled={checkoutLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-sm font-mono font-bold text-black shadow-lg transition-all hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                {checkoutLoading ? "Redirecting to checkout…" : `Unlock Maintainer Audit — $10`}
              </button>

              <Link
                href="/audit/sample"
                target="_blank"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full glass-card border border-white/[0.15] px-6 py-3.5 text-xs font-mono font-bold text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-all"
              >
                <ExternalLink className="h-4 w-4 text-sky-400" />
                View Sample Report
              </Link>
            </div>

            <p className="text-[11px] text-zinc-400">
              ⚡ Instant unlock · Maintainer-verified only · One-time, no subscription
            </p>
          </div>

          {/* Diagnostic Scope Preview */}
          <div className="rounded-2xl border border-white/[0.1] glass-panel p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-bold font-mono text-zinc-200 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
                What Gets Analyzed
              </h2>
              <span className="text-xs font-mono text-zinc-400">10 Live Dimensions</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ANALYSIS_STEPS.map((step) => (
                <div key={step.key} className="rounded-xl border border-white/[0.08] p-4 bg-black/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                      <span>{step.icon}</span> {step.label}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      step.badge === "Actionable"
                        ? "text-amber-400 bg-amber-950/60"
                        : "text-emerald-400 bg-emerald-950/60"
                    }`}>{step.badge}</span>
                  </div>
                  <p className="text-[12px] text-zinc-400">
                    {step.description}
                  </p>
                </div>
              ))}
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

// ─────────────────────────────────────────────────────────────────────────────
// Animated analyzing view — pure UX, no real backend streaming needed
// ─────────────────────────────────────────────────────────────────────────────

function AuditAnalyzingView({
  fullName,
  onComplete,
}: {
  fullName: string;
  onComplete: () => Promise<boolean>;
}) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState<string>(ANALYSIS_STEPS[0].key);
  const [done, setDone] = useState(false);
  const didFetch = useRef(false);

  useEffect(() => {
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    ANALYSIS_STEPS.forEach((step, i) => {
      // Mark previous as done + set this as active
      const startTimer = setTimeout(() => {
        setActiveStep(step.key);
        if (i > 0) {
          setCompletedSteps((prev) => new Set([...prev, ANALYSIS_STEPS[i - 1].key]));
        }
      }, cumulative);
      timers.push(startTimer);
      cumulative += step.durationMs;
    });

    // Mark last step done
    const finalTimer = setTimeout(() => {
      setCompletedSteps(new Set(ANALYSIS_STEPS.map((s) => s.key)));
      setDone(true);
    }, cumulative + 400);
    timers.push(finalTimer);

    // Fetch the actual report after all steps complete
    const fetchTimer = setTimeout(async () => {
      if (!didFetch.current) {
        didFetch.current = true;
        await onComplete();
      }
    }, cumulative + 800);
    timers.push(fetchTimer);

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const totalDone = completedSteps.size;
  const pct = Math.round((totalDone / ANALYSIS_STEPS.length) * 100);

  return (
    <div className="rounded-2xl border-2 border-white/[0.1] glass-panel p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 border border-emerald-500/30 text-emerald-400">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <h2 className="text-base font-bold font-mono text-white">Analyzing {fullName}</h2>
          <p className="text-xs text-zinc-400 font-mono">Running 10-dimension maintainer intelligence scan…</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps list */}
      <div className="space-y-2.5 mb-6">
        {ANALYSIS_STEPS.map((step) => {
          const isComplete = completedSteps.has(step.key);
          const isActive = activeStep === step.key && !isComplete;
          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-300 ${
                isActive
                  ? "bg-emerald-950/40 border border-emerald-500/30"
                  : isComplete
                  ? "bg-black/20 border border-white/[0.04]"
                  : "border border-transparent"
              }`}
            >
              <span className="text-base shrink-0">{step.icon}</span>
              <span
                className={`text-xs font-mono flex-1 transition-colors ${
                  isComplete
                    ? "text-zinc-400"
                    : isActive
                    ? "text-white font-bold"
                    : "text-zinc-600"
                }`}
              >
                {step.label}
              </span>
              <span className="shrink-0 text-[11px] font-mono">
                {isComplete ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> done
                  </span>
                ) : isActive ? (
                  <span className="text-emerald-300 flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3 animate-spin" /> running
                  </span>
                ) : (
                  <span className="text-zinc-700">queued</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs font-mono text-zinc-500">
        {done ? (
          <span className="text-emerald-400 animate-pulse">✓ Analysis complete — loading your report…</span>
        ) : (
          <span>{totalDone} of {ANALYSIS_STEPS.length} dimensions complete · est. {Math.max(0, Math.ceil((ANALYSIS_STEPS.length - totalDone) * 1.0))}s remaining</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Report content
// ─────────────────────────────────────────────────────────────────────────────

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

  // Derived maintainer-focused insights from existing data
  const rh = r.reviewer_health;
  const pf = r.pr_funnel;
  const ff = r.friction_fingerprint;

  const ghostRate = pf ? Math.max(0, 100 - pf.first_timer_success_rate - pf.repeat_contributor_rate * 0.5) : null;
  const isReviewerConcentrated = rh && (rh.bus_factor <= 1 || rh.distinct_maintainers <= 2);
  const avgResponseH = rh?.time_to_first_response_h ?? null;
  const topBottleneck = r.factors.find(f => f.status === "Bottleneck") ?? r.factors.find(f => f.status === "Needs Attention");

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
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-zinc-400">First response</span>
                  <span className="text-white font-bold">{rh.time_to_first_response_h.toFixed(1)}h</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <GitMerge className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-zinc-400">Merge rate</span>
                  <span className="text-white font-bold">{pf?.merge_rate.toFixed(1) ?? "—"}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <Users className="h-3.5 w-3.5 text-sky-400" />
                  <span className="text-zinc-400">Active reviewers</span>
                  <span className="text-white font-bold">{rh.distinct_maintainers}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <GitPullRequest className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-zinc-400">Avg review rounds</span>
                  <span className="text-white font-bold">{rh.avg_review_rounds.toFixed(1)}</span>
                </div>
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
                Currently at the <span className="text-amber-300 font-bold">{topBottleneck.peer_percentile.toFixed(0)}th percentile</span> among peers —{" "}
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
            <MetricTile label="Outside Merge Rate" value={`${pf.merge_rate.toFixed(1)}%`} color="emerald" note="of all submitted PRs" />
            <MetricTile label="PR Abandonment" value={`${pf.abandonment_rate.toFixed(1)}%`} color="rose" note="closed without merge" />
            <MetricTile label="First-Timer Merge" value={`${pf.first_timer_success_rate.toFixed(1)}%`} color="sky" note="newcomer success rate" />
            <MetricTile label="Repeat Contributor" value={`${pf.repeat_contributor_rate.toFixed(1)}%`} color="purple" note="came back for more" />
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
                  : "Your newcomer conversion is solid — focus on improving the merge timeline."
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
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                  <span className="text-zinc-400">Active Reviewers</span>
                  <span className="text-white font-bold">{rh.distinct_maintainers} people</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                  <span className="text-zinc-400">Bus Factor</span>
                  <span className={`font-bold ${rh.bus_factor <= 1 ? "text-rose-400" : rh.bus_factor <= 2 ? "text-amber-400" : "text-emerald-400"}`}>
                    {rh.bus_factor}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                  <span className="text-zinc-400">First-Response Time</span>
                  <span className={`font-bold ${(avgResponseH ?? 0) > 72 ? "text-rose-400" : (avgResponseH ?? 0) > 24 ? "text-amber-400" : "text-emerald-400"}`}>
                    {rh.time_to_first_response_h.toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-zinc-400">Concentration Risk</span>
                  <span className={`font-bold text-right max-w-[160px] ${isReviewerConcentrated ? "text-rose-400" : "text-zinc-300"}`}>
                    {rh.concentration_risk}
                  </span>
                </div>
              </div>

              {/* Burnout signal */}
              {isReviewerConcentrated && (
                <div className="rounded-xl border border-rose-800/50 bg-rose-950/25 p-3">
                  <p className="text-[11px] font-mono text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5 inline mr-1 mb-0.5" />
                    <span className="font-bold">Burnout Risk:</span>{" "}
                    {rh.bus_factor <= 1
                      ? "A single reviewer is your entire bottleneck. If they step back, PRs stall."
                      : "Small core team — consider explicitly mentoring 1-2 contributors toward reviewer status."
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
                <FrictionBar label="Code Style & Lint Nitpicks" pct={ff.formatting_and_style_pct} color="rose" />
                <FrictionBar label="Missing Tests & CI Breakages" pct={ff.missing_tests_and_ci_pct} color="amber" />
                <FrictionBar label="Scope & Architecture Discussion" pct={ff.scope_and_spec_pct} color="sky" />
              </div>
              {/* Friction insight */}
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <p className="text-[11px] font-mono text-zinc-300">
                  {ff.formatting_and_style_pct >= 40
                    ? <>
                        <span className="font-bold text-white">Quick win:</span>{" "}
                        {ff.formatting_and_style_pct.toFixed(0)}% of review friction is style/lint — a shared <span className="text-sky-400">.editorconfig</span> or pre-commit hook eliminates most of it without any human review cost.
                      </>
                    : ff.missing_tests_and_ci_pct >= 35
                    ? <>
                        <span className="font-bold text-white">Quick win:</span>{" "}
                        {ff.missing_tests_and_ci_pct.toFixed(0)}% of friction is missing tests. A required CI status check blocks this category before it reaches review.
                      </>
                    : <>
                        <span className="font-bold text-white">Architectural discussions</span> dominate your review friction — consider RFC or proposal templates for large changes.
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
            {r.ai_insights.warmth_score > 0 && (
              <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Warmth Score</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-rose-300">{r.ai_insights.warmth_score.toFixed(0)}</span>
                  <span className="text-xs text-zinc-500">/100</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800 mt-2 overflow-hidden">
                  <div className="h-full bg-rose-500/70" style={{ width: `${r.ai_insights.warmth_score}%` }} />
                </div>
              </div>
            )}
            {r.ai_insights.patience_score > 0 && (
              <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Patience Score</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-sky-300">{r.ai_insights.patience_score.toFixed(0)}</span>
                  <span className="text-xs text-zinc-500">/100</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800 mt-2 overflow-hidden">
                  <div className="h-full bg-sky-500/70" style={{ width: `${r.ai_insights.patience_score}%` }} />
                </div>
              </div>
            )}
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

      {/* ── DOS & DON'TS ── */}
      {(r.ai_insights.top_dos?.length > 0 || r.ai_insights.top_donts?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {r.ai_insights.top_dos?.length > 0 && (
            <section className="rounded-2xl border-2 border-emerald-900/60 glass-panel p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-white mb-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> What Contributors Should Do
              </h2>
              <ul className="space-y-2">
                {r.ai_insights.top_dos.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    {d}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {r.ai_insights.top_donts?.length > 0 && (
            <section className="rounded-2xl border-2 border-rose-900/60 glass-panel p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-white mb-3">
                <XCircle className="h-4 w-4 text-rose-400" /> What Contributors Must Avoid
              </h2>
              <ul className="space-y-2">
                {r.ai_insights.top_donts.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                    <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                    {d}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* ── DEEP SECTIONS ── */}
      {r.ai_insights.deep_sections?.length > 0 && (
        <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-white mb-4">
            <Sparkles className="h-4 w-4 text-purple-400" /> Deep Analysis Notes
          </h2>
          <div className="space-y-4">
            {r.ai_insights.deep_sections.map((s, i) => (
              <div key={i} className="rounded-xl border border-white/[0.08] bg-black/30 p-4">
                <h3 className="text-sm font-bold font-mono text-white mb-2">{s.title}</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
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
            <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-bold text-zinc-300">.github/pull_request_template.md</span>
                <button
                  type="button"
                  onClick={() => handleCopy("pr_template", r.actionable_templates!.pull_request_template)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 hover:text-sky-300 bg-sky-950/60 border border-sky-800/60 rounded px-2.5 py-1 transition-all cursor-pointer"
                >
                  {copiedTemplate === "pr_template" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedTemplate === "pr_template" ? "Copied!" : "Copy"}
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
                  {copiedTemplate === "contributing" ? "Copied!" : "Copy"}
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

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  color,
  note,
}: {
  label: string;
  value: string;
  color: "emerald" | "rose" | "sky" | "purple" | "amber";
  note?: string;
}) {
  const colorMap = {
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    sky: "text-sky-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
  };
  return (
    <div className="rounded-xl border border-white/[0.08] p-4 bg-black/40">
      <div className={`text-2xl font-bold font-mono ${colorMap[color]}`}>{value}</div>
      <div className="text-xs text-zinc-300 mt-1 font-medium">{label}</div>
      {note && <div className="text-[11px] text-zinc-500 mt-0.5">{note}</div>}
    </div>
  );
}

function FrictionBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: "rose" | "amber" | "sky";
}) {
  const barColor = { rose: "bg-rose-500", amber: "bg-amber-500", sky: "bg-sky-500" }[color];
  const textColor = { rose: "text-rose-400", amber: "text-amber-400", sky: "text-sky-400" }[color];
  return (
    <div>
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="text-zinc-300">{label}</span>
        <span className={`${textColor} font-bold`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
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
