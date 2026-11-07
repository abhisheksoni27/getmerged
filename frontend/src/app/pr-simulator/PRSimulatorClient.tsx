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
  if (score >= 60) return "bg-lime-400 text-white";
  if (score >= 40) return "bg-amber-400 text-white";
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

export function PRSimulatorClient() {
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

  async function copyBadgeUrl() {
    if (!shareText) return;
    const ok = await copyToClipboard(shareText);
    setCopied(ok ? "ok" : "failed");
    setTimeout(() => setCopied("idle"), 2500);
  }

  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-transparent text-[var(--text-primary)] font-sans">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Title Block */}
        <div className="border border-[var(--border-subtle)] glass-panel p-6 sm:p-8 rounded-md border-t-2 border-t-emerald-500 shadow-sm mb-8">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
            <Gauge className="w-4 h-4" />
            <span>PR MERGE CHANCE SIMULATOR</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
            Test Your Pull Request Before You Submit
          </h1>
          <p className="text-[var(--text-secondary)] text-sm sm:text-base leading-relaxed">
            Score your PR diff, title, and description against the target repo&apos;s real review history and CONTRIBUTING.md conventions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Form (2 cols) */}
          <form onSubmit={submit} className="lg:col-span-2 space-y-5">
            <div className="border border-[var(--border-subtle)] glass-panel p-6 rounded-md space-y-4">
              <div>
                <label htmlFor="sim-repo" className="block text-xs font-mono font-semibold uppercase text-[var(--text-secondary)] mb-1.5">
                  Target Repository (owner/name) <span className="text-red-400">*</span>
                </label>
                <input
                  id="sim-repo"
                  type="text"
                  required
                  placeholder="e.g. facebook/react or golang/go"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label htmlFor="sim-title" className="block text-xs font-mono font-semibold uppercase text-[var(--text-secondary)] mb-1.5">
                  PR Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="sim-title"
                  type="text"
                  required
                  placeholder="feat: add retry logic to event collector"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Conventional prefix (feat:/fix:), 10-72 characters, no WIP marker.
                </p>
              </div>

              <div>
                <label htmlFor="sim-desc" className="block text-xs font-mono font-semibold uppercase text-[var(--text-secondary)] mb-1.5">
                  PR Description / Body
                </label>
                <textarea
                  id="sim-desc"
                  rows={4}
                  placeholder="Explain what this PR solves, which issues it closes, and how you tested it..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div>
                <label htmlFor="sim-diff" className="block text-xs font-mono font-semibold uppercase text-[var(--text-secondary)] mb-1.5">
                  Git Unified Diff <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="sim-diff"
                  rows={10}
                  required
                  placeholder={`diff --git a/pkg/collector.go b/pkg/collector.go\nindex 1234567..89abcdef 100644\n--- a/pkg/collector.go\n+++ b/pkg/collector.go\n@@ -10,3 +10,7 @@\n+func Retry() error {\n+    return nil\n+}`}
                  value={diff}
                  onChange={(e) => setDiff(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Run <code className="bg-zinc-800 px-1 py-0.5 rounded text-[var(--text-secondary)] font-mono">git diff origin/main...HEAD</code> and paste here. Max 1MB.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-950/50 border border-red-500/50 rounded text-red-300 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded shadow transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Simulating PR Review...
                  </>
                ) : (
                  <>
                    <Gauge className="w-4 h-4" />
                    Simulate PR Merge Chance
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right Results / Guidance Panel (1 col) */}
          <div className="space-y-6">
            {result ? (
              <div className="border border-[var(--border-subtle)] glass-panel p-6 rounded-md space-y-5">
                <div className="text-center pb-4 border-b border-[var(--border-subtle)]">
                  <div className="text-xs font-mono text-[var(--text-secondary)] uppercase mb-1">Predicted Score</div>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-5xl font-extrabold font-mono text-[var(--text-primary)]">
                      {result.score}
                    </span>
                    <span className="text-zinc-500 text-2xl font-mono">/ 100</span>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold font-mono ${scoreColor(result.score)}`}>
                      {result.score >= 80
                        ? "HIGH MERGE LIKELIHOOD"
                        : result.score >= 60
                        ? "MODERATE CHANCE"
                        : result.score >= 40
                        ? "RISK OF STALL"
                        : "HIGH REJECTION RISK"}
                    </span>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div>
                  <h3 className="text-xs font-mono font-semibold uppercase text-[var(--text-secondary)] mb-2">
                    Evaluation Breakdown
                  </h3>
                  <div className="space-y-2">
                    {WEIGHTS.map(({ key, label, max }) => {
                      const val = result.breakdown[key] ?? 0;
                      const pct = Math.min(100, Math.round((val / max) * 100));
                      return (
                        <div key={key} className="text-xs">
                          <div className="flex justify-between text-[var(--text-secondary)] font-mono mb-1">
                            <span>{label}</span>
                            <span>
                              {val} / {max}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Turnaround Estimate */}
                {result.turnaround && (
                  <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)] font-mono font-semibold">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Historical Turnaround</span>
                    </div>
                    {result.turnaround.insufficient_history ? (
                      <p className="text-zinc-500">
                        Insufficient recent merged PRs in this repo to reliably project turnaround.
                      </p>
                    ) : typeof result.turnaround.median_hours === "number" ? (
                      <p className="text-[var(--text-secondary)]">
                        Typical median first review on this repo arrives in{" "}
                        <strong className="text-[var(--text-primary)] font-mono">
                          {humanHours(result.turnaround.median_hours)}
                        </strong>{" "}
                        (sampled over {result.turnaround.samples} recent PRs).
                      </p>
                    ) : null}
                  </div>
                )}

                {/* Suggestions */}
                {result.suggestions && result.suggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase text-amber-300 mb-2">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Actionable Improvements</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-[var(--text-secondary)] list-disc list-inside">
                      {result.suggestions.map((sug, i) => (
                        <li key={i} className="leading-relaxed">
                          {sug}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Badge Share */}
                {shareText && (
                  <div className="pt-3 border-t border-[var(--border-subtle)]">
                    <div className="text-xs font-mono text-[var(--text-secondary)] mb-1.5">Shareable Badge</div>
                    <button
                      type="button"
                      onClick={copyBadgeUrl}
                      className="w-full py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 border border-[var(--border-subtle)] text-xs font-mono rounded flex items-center justify-center gap-1.5 text-[var(--text-primary)]"
                    >
                      {copied === "ok" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied Badge URL</span>
                        </>
                      ) : (
                        <>
                          <ClipboardCopy className="w-3.5 h-3.5" />
                          <span>Copy Badge SVG Link</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Instructions before running */
              <div className="border border-[var(--border-subtle)] glass-panel p-6 rounded-md space-y-4 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-mono font-bold text-sm">
                  <FileDiff className="w-4 h-4 text-emerald-400" />
                  <span>How PR Scoring Works</span>
                </div>
                <p className="leading-relaxed">
                  Our model compares your diff and metadata against thousands of merged pull requests across GitHub to calculate merge probability:
                </p>
                <div className="space-y-2 font-mono text-[11px]">
                  {WEIGHTS.map(({ label, max, hint }) => (
                    <div key={label} className="border-b border-[var(--border-subtle)] pb-2 last:border-0">
                      <div className="flex justify-between text-[var(--text-secondary)] font-semibold">
                        <span>{label}</span>
                        <span className="text-emerald-400">+{max} pts</span>
                      </div>
                      <p className="text-zinc-500 font-sans mt-0.5">{hint}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
