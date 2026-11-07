import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileCode2,
  GitPullRequest,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "C-Rank™ Methodology Changelog & Recalibrations | GetMerged",
  description:
    "Transparent audit log of C-Rank algorithm versions, formula weight calibrations, and resolved maintainer telemetry disputes.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/methodology/changelog",
  },
};

interface DisputeItem {
  id: number;
  repo_full_name: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
}

async function getDisputes(): Promise<DisputeItem[]> {
  try {
    const res = await fetch("http://127.0.0.1:8080/api/v1/disputes/changelog", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.disputes || [];
  } catch {
    return [];
  }
}

export default async function MethodologyChangelogPage() {
  const disputes = await getDisputes();

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent dev-grid-pattern text-white font-sans">
      <Header />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <Link prefetch={false}
          href="/how-c-rank-works"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl surface-base border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8 font-sans"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Methodology
        </Link>

        {/* Hero Header */}
        <div className="rounded-3xl surface-base p-8 sm:p-10 border border-[var(--border-subtle)] shadow-xs mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-xs font-semibold mb-4">
            <ShieldCheck className="h-3.5 w-3.5" /> Public Auditing &amp; Recalibration Log
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-space text-[var(--text-primary)] tracking-tight">
            Methodology Changelog &amp; Dispute Resolutions
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            In open source, trust requires complete auditability. Every parameter adjustment, model recalibration, and maintainer dispute resolution is permanently documented here.
          </p>
        </div>

        {/* Algorithm Versions */}
        <div className="space-y-6 mb-16">
          <div className="border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-xl font-bold font-space text-[var(--text-primary)] flex items-center gap-2">
              <FileCode2 className="h-5 w-5 text-amber-400" />
              Algorithm Parameter Releases
            </h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl surface-base p-6 border border-[var(--border-subtle)] shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-md">
                    v2026.2 (Active Production)
                  </span>
                  <span className="text-xs font-mono text-[var(--text-secondary)] flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> September 2026
                  </span>
                </div>
                <span className="text-xs font-mono text-[var(--text-secondary)]">102,094 Repositories Calibrated</span>
              </div>
              <ul className="text-xs sm:text-sm text-[var(--text-secondary)] space-y-2 list-disc list-inside leading-relaxed font-sans">
                <li><strong className="text-[var(--text-primary)]">Bayesian Shrinkage Prior:</strong> Exponential confidence weight <code className="text-amber-300 font-mono">1 - exp(-n / 6.0)</code> shrinks repos with small sample sizes towards the 50.0 neutral median.</li>
                <li><strong className="text-[var(--text-primary)]">Bus Factor Safety Ceiling:</strong> Repos with single active maintainers (<code className="text-amber-300 font-mono">bus_factor &le; 1</code>) are hard-capped at Tier B regardless of raw composite score.</li>
                <li><strong className="text-[var(--text-primary)]">Logarithmic GFI Bonus:</strong> Replaced discrete 15% jump with continuous damped curve <code className="text-amber-300 font-mono">min(5.0, 2.5 * ln(1 + gfiCount))</code>.</li>
                <li><strong className="text-[var(--text-primary)]">Boundary Hysteresis:</strong> Universal &plusmn;2.0 point retention band prevents tier flapping due to weekly variance.</li>
              </ul>
            </div>

            <div className="rounded-2xl surface-base p-6 border border-white/[0.08] opacity-75 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-[var(--text-secondary)] bg-zinc-800 border border-[var(--border-subtle)] px-2.5 py-1 rounded-md">
                    v2026.1 (Legacy)
                  </span>
                  <span className="text-xs font-mono text-[var(--text-secondary)] flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Q1 2026
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans leading-relaxed">
                Initial public release. 9-signal weighted composite, 180-day lookback window, hard staleness cap for dormant repos.
              </p>
            </div>
          </div>
        </div>

        {/* Resolved Community Disputes */}
        <div className="space-y-6">
          <div className="border-b border-[var(--border-subtle)] pb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold font-space text-[var(--text-primary)] flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-blue-400" />
              Maintainer Score Disputes &amp; Resolutions
            </h2>
            <Link prefetch={false}
              href="/dispute"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors"
            >
              + File a Dispute
            </Link>
          </div>

          {disputes.length === 0 ? (
            <div className="rounded-2xl surface-base p-8 text-center border border-white/[0.08]">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-space text-[var(--text-primary)] font-semibold">Zero Pending Queue Backlog</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                All submitted maintainer disputes have been processed under our 48-hour SLA.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {disputes.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl surface-base p-4 border border-white/[0.08] flex items-center justify-between gap-4 text-xs font-mono"
                >
                  <div>
                    <span className="text-white font-bold">{d.repo_full_name}</span>
                    <span className="text-[var(--text-secondary)] ml-2">({d.reason})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      {d.status}
                    </span>
                    <span className="text-[var(--text-tertiary)]">{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
