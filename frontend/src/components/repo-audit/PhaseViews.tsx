"use client";

import Link from "next/link";
import { AlertCircle, ExternalLink, FileSearch, Lock, SlidersHorizontal, Zap } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { ANALYSIS_STEPS } from "./constants";
import { AuditShell } from "./AuditShell";
import { AuditAnalyzingView } from "./AuditAnalyzingView";

export function CheckingView({ fullName }: { fullName: string }) {
  return <AuditShell fullName={fullName}><p className="text-sm text-[var(--text-secondary)]">Loading diagnostic report…</p></AuditShell>;
}

export function UnauthView({ fullName }: { fullName: string }) {
  return (
    <AuditShell fullName={fullName}>
      <div className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-950/80 border-amber-800/80 border border-amber-200 text-amber-600">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold font-mono text-[var(--text-primary)] mb-2">Sign in to view the Maintainer Audit</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
          Maintainer audits are tied to verified repo admins. Sign in with GitHub to continue.
        </p>
        <a
          href={`${API_BASE_URL}/api/v1/auth/github`}
          className="inline-flex items-center gap-2 rounded-full glass-card px-6 py-3 text-xs font-mono font-bold text-[var(--text-primary)] hover:bg-zinc-800 transition-all"
        >
          <Lock className="h-4 w-4" /> Sign in with GitHub
        </a>
      </div>
    </AuditShell>
  );
}

export function NotFoundView({ fullName }: { fullName: string }) {
  return (
    <AuditShell fullName={fullName}>
      <div className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-8 text-center">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Repository not found</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2">This repository is not indexed yet.</p>
      </div>
    </AuditShell>
  );
}

export function ErrorView({ fullName, errorMsg }: { fullName: string; errorMsg: string | null }) {
  return (
    <AuditShell fullName={fullName}>
      <div className="rounded-2xl border-2 border-rose-200 bg-rose-950/70 border-rose-800/80 p-8 text-center">
        <AlertCircle className="h-7 w-7 mx-auto text-rose-600 mb-3" />
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Something went wrong</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2">{errorMsg}</p>
      </div>
    </AuditShell>
  );
}

export function AnalyzingView({ fullName, onComplete }: { fullName: string; onComplete: () => Promise<boolean> }) {
  return (
    <AuditShell fullName={fullName}>
      <AuditAnalyzingView fullName={fullName} onComplete={onComplete} />
    </AuditShell>
  );
}

export function PayView({
  fullName,
  errorMsg,
  checkoutLoading,
  onCheckout,
}: {
  fullName: string;
  errorMsg: string | null;
  checkoutLoading: boolean;
  onCheckout: () => void;
}) {
  return (
    <AuditShell fullName={fullName}>
      <div className="space-y-6">
        {/* Hero Paywall Card */}
        <div className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-8 shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-40 h-40 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 transform -translate-x-4 translate-y-4 w-32 h-32 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 border-2 border-emerald-500/30 text-emerald-400 -rotate-2">
            <FileSearch className="h-7 w-7" />
          </div>

          <span className="inline-block rounded-full bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 font-mono text-xs font-bold text-emerald-300 mb-3">
            $10 · One-Time · Maintainer Intelligence Report
          </span>

          <h1 className="text-2xl font-bold font-mono text-[var(--text-primary)] mb-2">
            Deep Audit for {fullName}
          </h1>

          <p className="text-sm text-[var(--text-secondary)] mb-2 max-w-xl mx-auto leading-relaxed">
            10-dimension live analysis using your GitHub token. Stale PR triage, reviewer burnout signals,
            contributor retention curves, and ready-to-copy GitHub templates - generated for you, not at you.
          </p>

          {/* Mini dimension grid teaser */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-lg mx-auto">
            {ANALYSIS_STEPS.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md">
                <span>{s.icon}</span> {s.label}
              </span>
            ))}
          </div>

          {errorMsg && <p className="text-xs text-rose-400 mb-3">{errorMsg}</p>}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <button
              type="button"
              onClick={onCheckout}
              disabled={checkoutLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-sm font-mono font-bold text-black shadow-lg transition-all hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              {checkoutLoading ? "Redirecting to checkout…" : `Unlock Maintainer Audit - $10`}
            </button>

            <Link prefetch={false}
              href="/audit/sample"
              target="_blank"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full glass-card border border-[var(--border-subtle)] px-6 py-3.5 text-xs font-mono font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-800/80 transition-all"
            >
              <ExternalLink className="h-4 w-4 text-sky-400" />
              View Sample Report
            </Link>
          </div>

          <p className="text-[11px] text-[var(--text-secondary)]">
            ⚡ Instant unlock · Maintainer-verified only · One-time, no subscription
          </p>
        </div>

        {/* Diagnostic Scope Preview */}
        <div className="rounded-2xl border border-[var(--border-subtle)] glass-panel p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-bold font-mono text-[var(--text-secondary)] flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
              What Gets Analyzed
            </h2>
            <span className="text-xs font-mono text-[var(--text-secondary)]">10 Live Dimensions</span>
          </div>

          <DimensionGrid />
        </div>
      </div>
    </AuditShell>
  );
}

export function DimensionGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {ANALYSIS_STEPS.map((step) => (
        <div key={step.key} className="rounded-xl border border-[var(--border-subtle)] p-4 bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold font-mono text-[var(--text-primary)] flex items-center gap-1.5">
              <span>{step.icon}</span> {step.label}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
              step.badge === "Actionable"
                ? "text-amber-400 bg-amber-950/60"
                : "text-emerald-400 bg-emerald-950/60"
            }`}>{step.badge}</span>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {step.description}
          </p>
        </div>
      ))}
    </div>
  );
}
