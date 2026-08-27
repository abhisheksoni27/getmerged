"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { API_BASE_URL } from "@/lib/api";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { ClipboardCopy, Check, Gauge, Clock, Lightbulb, FileDiff } from "lucide-react";

interface ScoreBreakdown {
  title: number;
  diff_size: number;
  tests_touched: number;
  description_length: number;
  contributing_match: number;
}

interface Turnaround {
  median_hours?: number;
  samples: number;
  insufficient_history?: boolean;
}

interface SimResult {
  submission_id?: string;
  score: number;
  breakdown: ScoreBreakdown;
  suggestions?: string[];
  turnaround?: Turnaround | null;
}

const WEIGHTS: { key: keyof ScoreBreakdown; label: string; max: number; hint: string }[] = [
  {
    key: "title",
    label: "Title quality",
    max: 30,
    hint: "Length 10-72 chars, no WIP markers or trailing period, conventional prefix (feat:/fix:) - up to 30 points.",
  },
  {
    key: "diff_size",
    label: "Diff size",
    max: 25,
    hint: "Diffs under 400 changed lines earn the full 25 points; the score decays linearly and hits zero at 1000+.",
  },
  {
    key: "tests_touched",
    label: "Tests touched",
    max: 20,
    hint: "The diff adds or updates test files (_test.go, *.test.*, *.spec.*, /tests/, __tests__) - worth 20 points.",
  },
  {
    key: "description_length",
    label: "Description length",
    max: 15,
    hint: "A PR description longer than 50 characters earns 15 points.",
  },
  {
    key: "contributing_match",
    label: "CONTRIBUTING.md match",
    max: 10,
    hint: "Your change pattern-matches the target repo's CONTRIBUTING.md guidance (tests, lint, commit style) - up to 10 points.",
  },
];

function humanHours(h: number): string {
  if (h < 1) return "under an hour";
  if (h < 48) return `about ${Math.round(h)}h`;
  return `about ${Math.round(h / 24)} days`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-500 text-white";
  if (score >= 60) return "bg-lime-400 text-slate-100";
  if (score >= 40) return "bg-amber-400 text-slate-100";
  return "bg-red-500 text-white";
}

const SIM_ERROR_MESSAGES: Record<string, string> = {
  invalid_json: "The simulator could not read that submission - check the form and retry.",
  missing_fields: "Title, repository and diff are all required.",
  invalid_repo_slug: "Use a public GitHub repository as owner/repo.",
  diff_too_large: "That diff exceeds the 1MB limit - trim it or split the change.",
  invalid_diff: "Paste a unified diff (git diff output) starting with 'diff --git' or '@@'.",
  repo_not_found: "Repository not found or not publicly accessible - anonymous scoring only covers public repos.",
  upstream_rate_limited: "GitHub is rate-limiting us for this repository right now - please retry shortly.",
  rate_limited: "You've hit the hourly limit of 10 simulations - try again later.",
};

function simErrorMessage(json: unknown, status: number): string {
  if (json && typeof json === "object") {
    const rec = json as Record<string, unknown>;
    if (typeof rec.error === "string" && rec.error.trim()) return rec.error;
    const code = typeof rec.error_code === "string" ? SIM_ERROR_MESSAGES[rec.error_code] : undefined;
    if (code) return code;
    if (
      rec.error_code === "upstream_rate_limited" &&
      typeof rec.retry_after === "number" &&
      Number.isFinite(rec.retry_after)
    ) {
      return `GitHub rate limit reached - retry in about ${Math.max(1, Math.round(rec.retry_after / 60))} minute(s).`;
    }
  }
  return `Simulation failed (${status}).`;
}

export default function PRSimulatorPage() {
  const [repo, setRepo] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [diff, setDiff] = useState("");
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"idle" | "ok" | "failed">("idle");
  const [shareText, setShareText] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setCopied("idle");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pr-sim/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_slug: repo, repo, title, description, diff }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(simErrorMessage(json, res.status));
        return;
      }
      if (json && typeof json.score === "number" && json.breakdown) {
        setResult(json as SimResult);
        setShareText(
          json.submission_id
            ? `${API_BASE_URL}/api/v1/pr-sim/badge/${json.submission_id}.svg`
            : "",
        );
      } else {
        setError("Unexpected response from the simulator.");
      }
    } catch {
      setError("Network error - could not reach the simulator. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  async function copyShare() {
    if (!shareText) return;
    const ok = await copyToClipboard(shareText);
    // AC7: when both clipboard paths fail, keep the selectable box visible.
    setCopied(ok ? "ok" : "failed");
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea] font-mono">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-space font-black tracking-tight text-slate-100 mb-2">
          PR Acceptance Simulator
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          Paste a draft diff before opening your PR and see its simulated merge odds, predicted review turnaround,
          and what to fix first.
        </p>

        <form
          onSubmit={submit}
          className="rounded-2xl bg-[#111827] p-6 border-2 border-brand-dark shadow-sm space-y-5"
        >
          <div>
            <label htmlFor="sim-repo" className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
              Target repository
            </label>
            <input
              id="sim-repo"
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repo or https://github.com/owner/repo"
              required
              maxLength={255}
              className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
          <div>
            <label htmlFor="sim-title" className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
              Draft PR title
            </label>
            <input
              id="sim-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='feat: add streaming ingest'
              required
              maxLength={200}
              className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
          <div>
            <label htmlFor="sim-desc" className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
              Description
            </label>
            <textarea
              id="sim-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={10000}
              placeholder={"What does this change do? (>50 characters earns full points)"}
              className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
          <div>
            <label htmlFor="sim-diff" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
              <FileDiff className="h-3.5 w-3.5" aria-hidden="true" />
              Unified diff (git diff output, max 1MB)
            </label>
            <textarea
              id="sim-diff"
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              rows={10}
              spellCheck={false}
              placeholder={"diff --git a/src/app.ts b/src/app.ts\n--- a/src/app.ts\n+++ b/src/app.ts\n@@ ..."}
              required
              className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs leading-relaxed bg-[#1e293b] focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Encrypted at rest, auto-deleted after 24 hours, never shown publicly.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="pr-sim-submit"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-dark px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <Gauge className="h-4 w-4" aria-hidden="true" />
            {loading ? "Simulating..." : "Simulate acceptance"}
          </button>
        </form>

        {result && (
          <section
            data-testid="pr-sim-result"
            className="mt-8 rounded-2xl bg-[#111827] p-6 border-2 border-brand-dark shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div className={`rounded-2xl px-6 py-4 ${scoreColor(result.score)}`}>
                <div className="text-3xl font-space font-black">{result.score}/100</div>
                <div className="text-[11px] uppercase tracking-wide opacity-80">Simulated acceptance score</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Clock className="h-4 w-4 text-blue-600" aria-hidden="true" />
                {result.turnaround == null ? (
                  <span>Turnaround unavailable for this repo.</span>
                ) : result.turnaround.insufficient_history ? (
                  <span>Insufficient history (fewer than 10 merged PRs).</span>
                ) : typeof result.turnaround.median_hours === "number" ? (
                  <span>
                    Median review turnaround:{" "}
                    <strong className="font-mono">{humanHours(result.turnaround.median_hours)}</strong>
                    <span className="text-slate-400 text-xs ml-1">({result.turnaround.samples} merged PRs)</span>
                  </span>
                ) : (
                  <span>Insufficient history.</span>
                )}
              </div>
            </div>

            <ul className="space-y-3 mb-5">
              {WEIGHTS.map((w) => {
                const pts = result.breakdown[w.key] ?? 0;
                const pct = Math.max(0, Math.min(100, (pts / w.max) * 100));
                return (
                  <li key={w.key} title={w.hint} className="group">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1 cursor-help">
                      <span>{w.label}</span>
                      <span className="font-mono">
                        {pts}/{w.max}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#1e293b] border border-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="hidden group-hover:block mt-1 text-[11px] text-slate-400">{w.hint}</p>
                  </li>
                );
              })}
            </ul>

            {result.suggestions && result.suggestions.length > 0 && (
              <div className="mb-5 rounded-xl bg-amber-950/70 border-amber-800/80 border border-amber-200 p-4">
                <div className="flex items-center gap-1.5 text-sm font-bold text-amber-300 mb-2">
                  <Lightbulb className="h-4 w-4" aria-hidden="true" /> Improve merge odds
                </div>
                <ul className="list-disc pl-5 space-y-1 text-sm text-amber-300">
                  {result.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.submission_id && (
              <div>
                <img
                  src={`${API_BASE_URL}/api/v1/pr-sim/badge/${result.submission_id}.svg`}
                  alt={`Simulated acceptance badge: ${result.score} out of 100`}
                  width={140}
                  height={20}
                  className="mb-3"
                />
                {copied === "failed" ? (
                  <input
                    type="text"
                    readOnly
                    value={shareText}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Badge URL - select and copy manually"
                    className="w-full rounded-lg border border-slate-700 bg-[#1e293b] px-3 py-2 text-xs text-slate-300 select-all"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={copyShare}
                    data-testid="pr-sim-copy"
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-brand-dark bg-[#1e293b] px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-[#1e293b]"
                  >
                    {copied === "ok" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> Copied badge URL
                      </>
                    ) : (
                      <>
                        <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" /> Copy badge URL
                      </>
                    )}
                  </button>
                )}
                {copied === "failed" && (
                  <p className="mt-1 text-[11px] text-slate-400">Automatic copy unavailable - select the text above and copy manually.</p>
                )}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
