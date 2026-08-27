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
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface AuditFactor {
  key: string;
  label: string;
  raw_value: number;
  normalized_score: number;
  peer_percentile: number;
  weight: number;
  contribution: number;
}

interface DeepSection {
  title: string;
  body: string;
}

interface AuditAIInsights {
  maintainer_vibe: string | null;
  maintainer_persona: string | null;
  warmth_score: number;
  patience_score: number;
  nitpick_ratio: number;
  top_dos: string[];
  top_donts: string[];
  deep_sections: DeepSection[];
}

interface PrioritizedFix {
  priority: number;
  type: string;
  text?: string;
  title?: string;
}

interface AuditReport {
  repo: {
    full_name: string;
    language: string | null;
    stars: number;
    description: string | null;
    c_rank_score: number;
    c_rank_tier: string;
  };
  overall: { score: number; tier: string; factor_contribution: number };
  factors: AuditFactor[];
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
      const res = await fetch(`${API_BASE_URL}/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/audit`, {
        credentials: "include",
      });
      if (res.status === 403) return false;
      if (res.status === 404) {
        setPhase("notfound");
        return true;
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
      const res = await fetch(`${API_BASE_URL}/api/audit/status?repo_key=${encodeURIComponent(repoKey)}`, {
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
        // Not purchased (403): show purchase flow and reconcile via poll in
        // case the webhook lands after Dodo redirects back (AC6).
        setPhase("pay");
        startPolling();
      }
    })();
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [fetchReport, startPolling]);

  const startCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/audit/checkout`,
        { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } }
      );
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
      const res = await fetch(
        `${API_BASE_URL}/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/audit/regen`,
        { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } }
      );
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
      // AC7: on limit hit serve the cached report with no error / no new cost.
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
    return <AuditShell fullName={fullName}><p className="text-sm text-slate-400">Loading your audit…</p></AuditShell>;
  }

  if (phase === "unauth") {
    return (
      <AuditShell fullName={fullName}>
        <div className="rounded-2xl border-2 border-brand-dark bg-[#111827] p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-950/80 border-amber-800/80 border border-amber-200 text-amber-600">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold font-mono text-slate-100 mb-2">Sign in to view the Full Audit</h1>
          <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
            The deep-audit report is tied to your account. Sign in to unlock the full C-Rank breakdown, peer percentiles and AI-prioritized fixes.
          </p>
          <a
            href={`${API_BASE_URL}/api/v1/auth/github`}
            className="inline-flex items-center gap-2 rounded-full bg-[#1e293b] px-6 py-3 text-xs font-mono font-bold text-white hover:bg-zinc-800 transition-all"
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
        <div className="rounded-2xl border-2 border-slate-800 bg-[#111827] p-8 text-center">
          <h1 className="text-xl font-bold text-slate-100">Repository not found</h1>
          <p className="text-sm text-slate-400 mt-2">This repository is not indexed yet.</p>
        </div>
      </AuditShell>
    );
  }

  if (phase === "error") {
    return (
      <AuditShell fullName={fullName}>
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-950/70 border-rose-800/80 p-8 text-center">
          <AlertCircle className="h-7 w-7 mx-auto text-rose-600 mb-3" />
          <h1 className="text-xl font-bold text-slate-100">Something went wrong</h1>
          <p className="text-sm text-slate-400 mt-2">{errorMsg}</p>
        </div>
      </AuditShell>
    );
  }

  if (phase === "pay") {
    return (
      <AuditShell fullName={fullName}>
        <div className="rounded-2xl border-2 border-brand-dark bg-gradient-to-br from-yellow-100 via-white to-emerald-100 p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-200 border-2 border-brand-dark text-slate-50 -rotate-2">
            <FileSearch className="h-7 w-7" />
          </div>
          <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 font-mono text-xs font-bold text-yellow-900 mb-3">
            One-Time Purchase
          </span>
          <h1 className="text-2xl font-bold font-mono text-slate-50 mb-2">Full Repo Deep-Audit - $19</h1>
          <p className="text-sm text-slate-300 mb-6 max-w-md mx-auto">
            Get the complete per-factor C-Rank breakdown, percentile vs peer repos, and AI-prioritized fixes to raise your rank - no subscription required.
          </p>
          {errorMsg && <p className="text-xs text-rose-600 mb-3">{errorMsg}</p>}
          <button
            type="button"
            onClick={startCheckout}
            disabled={checkoutLoading}
            className="inline-flex items-center gap-2 rounded-full bg-[#ffd93d] px-6 py-3 text-xs font-mono font-bold text-slate-50 shadow-sm transition-all hover:bg-[#ffdf5c] active:scale-[0.99] disabled:opacity-60"
          >
            <FileSearch className="h-4 w-4" />
            {checkoutLoading ? "Redirecting to checkout…" : "Get Full Audit - $19"}
          </button>
          <p className="text-[11px] text-slate-400 mt-4">
            Verifying payment… we’ll unlock the report automatically once confirmed.
          </p>
        </div>
      </AuditShell>
    );
  }

  // phase === "report"
  const r = report as AuditReport;
  return (
    <AuditShell fullName={fullName}>
      <div className="space-y-8">
        {/* Summary */}
        <section className="rounded-2xl border-2 border-brand-dark bg-[#111827] p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="inline-block rounded-full bg-emerald-950/80 border-emerald-800/80 px-3 py-1 font-mono text-xs font-bold text-emerald-300 mb-2">
                Deep-Audit Unlocked
              </span>
              <h1 className="text-2xl font-bold font-mono text-slate-50">{r.repo.full_name}</h1>
              {r.repo.description && <p className="text-sm text-slate-400 mt-1 max-w-2xl">{r.repo.description}</p>}
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold font-mono text-slate-50">{r.overall.score.toFixed(1)}</div>
              <div className="text-xs font-mono text-slate-400">C-Rank · Tier {r.overall.tier}</div>
            </div>
          </div>
        </section>

        {/* Per-factor C-Rank breakdown */}
        <section className="rounded-2xl border-2 border-brand-dark bg-[#111827] p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-slate-50 mb-4">
            <Sparkles className="h-4 w-4 text-indigo-500" /> Full C-Rank Per-Factor Breakdown
          </h2>
          <div className="space-y-3">
            {r.factors.map((f) => (
              <div key={f.key} className="rounded-xl border border-slate-800 p-3">
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="font-bold text-slate-200">{f.label}</span>
                  <span className="text-slate-400">
                    raw {fmtNum(f.raw_value)} · peer {f.peer_percentile.toFixed(0)}th · weight {(f.weight * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#1e293b] overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, f.normalized_score))}%` }} />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">contribution to score: {f.contribution.toFixed(1)} pts</div>
              </div>
            ))}
          </div>
        </section>

        {/* AI-prioritized fixes */}
        <section className="rounded-2xl border-2 border-brand-dark bg-gradient-to-br from-cyan-100 via-white to-emerald-100 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-slate-50">
              <Sparkles className="h-4 w-4 text-emerald-600" /> AI-Prioritized Fixes
            </h2>
            <button
              type="button"
              onClick={regenerate}
              disabled={regenLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-brand-dark bg-[#111827] px-3 py-1.5 text-[11px] font-mono font-bold text-slate-200 shadow-sm transition-all hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${regenLoading ? "animate-spin" : ""}`} />
              {regenLoading ? "Regenerating…" : "Regenerate (1/day)"}
            </button>
          </div>
          {regenNote && <p className="text-[11px] text-slate-400 mb-3">{regenNote}</p>}
          {r.prioritized_fixes.length === 0 ? (
            <p className="text-xs text-slate-400">No prioritized fixes available yet - run “Regenerate” to analyze the latest discussions.</p>
          ) : (
            <ol className="space-y-2">
              {r.prioritized_fixes.map((fix) => (
                <li key={fix.priority} className="flex items-start gap-2 rounded-xl border border-brand-dark bg-[#111827] p-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0f172a] text-[10px] font-bold text-white">
                    {fix.priority}
                  </span>
                  <div className="text-xs text-slate-200">
                    {fix.type === "avoid" ? (
                      <span className="inline-flex items-center gap-1 text-rose-700"><XCircle className="h-3.5 w-3.5" /> Avoid:</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-indigo-700"><CheckCircle2 className="h-3.5 w-3.5" /> {fix.title}</span>
                    )}{" "}
                    {fix.text}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {(r.ai_insights.maintainer_vibe || r.ai_insights.top_dos.length > 0) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {r.ai_insights.top_dos.length > 0 && (
                <div className="rounded-xl border-2 border-brand-dark bg-emerald-950/80 border-emerald-800/80 p-4 shadow-sm">
                  <h4 className="text-xs font-mono font-bold text-emerald-300 uppercase mb-2">Top Do’s</h4>
                  <ul className="space-y-1 text-xs text-emerald-950">
                    {r.ai_insights.top_dos.map((d, i) => (
                      <li key={i} className="flex items-start gap-2"><span className="text-emerald-600 font-bold">•</span><span>{d}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {r.ai_insights.top_donts.length > 0 && (
                <div className="rounded-xl border-2 border-brand-dark bg-rose-100 p-4 shadow-sm">
                  <h4 className="text-xs font-mono font-bold text-rose-300 uppercase mb-2">Top Don’ts</h4>
                  <ul className="space-y-1 text-xs text-rose-950">
                    {r.ai_insights.top_donts.map((d, i) => (
                      <li key={i} className="flex items-start gap-2"><span className="text-rose-600 font-bold">•</span><span>{d}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </AuditShell>
  );
}

function fmtNum(v: number): string {
  if (v >= 100) return v.toFixed(0);
  if (v >= 1) return v.toFixed(1);
  return v.toFixed(2);
}

function AuditShell({ fullName, children }: { fullName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-[#0f172a] overflow-x-hidden">
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <Link
          href={`/${fullName}`}
          title="Back to repository"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-100 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {fullName}
        </Link>
        {children}
      </main>
    </div>
  );
}
