"use client";

import React, { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Gauge,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Zap,
  FileDiff,
  Link2,
  Type,
} from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  hint: string;
  weight: number;
}

const CONVENTIONAL_PREFIXES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "chore",
  "build",
  "ci",
];

function parseIssueLink(link: string): { valid: boolean; repo?: string; number?: string } {
  const trimmed = link.trim();
  if (!trimmed) return { valid: false };
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    const idx = segments.indexOf("issues");
    if (
      (url.hostname === "github.com" || url.hostname === "www.github.com") &&
      idx > 0 &&
      idx + 1 < segments.length
    ) {
      return { valid: true, repo: `${segments[idx - 1]}/${segments[idx - 2]}`, number: segments[idx + 1] };
    }
  } catch {
    /* not a URL */
  }
  return { valid: false };
}

function buildChecklist(title: string, files: string, lines: string, summary: string, issueLink: string): ChecklistItem[] {
  const t = title.trim();
  const lowerTitle = t.toLowerCase();
  const lowerSummary = summary.toLowerCase();
  const numFiles = parseInt(files, 10) || 0;
  const numLines = parseInt(lines, 10) || 0;
  const issue = parseIssueLink(issueLink);

  return [
    {
      id: "title-length",
      label: "Clear, concise PR title (10–70 chars)",
      done: t.length >= 10 && t.length <= 70,
      hint:
        t.length === 0
          ? "Add a descriptive title."
          : t.length < 10
            ? "Title is too short - describe what changes and why."
            : "Trim the title to under 70 characters.",
      weight: 15,
    },
    {
      id: "title-convention",
      label: "Follows conventional-commit style (feat:, fix:, …)",
      done: CONVENTIONAL_PREFIXES.some((p) => lowerTitle.startsWith(p + ":") || lowerTitle.startsWith(p + "(")),
      hint: 'Prefix the title with a type like "feat:" or "fix:".',
      weight: 10,
    },
    {
      id: "diff-size",
      label: "Focused diff (≤ 10 files and ≤ 400 lines)",
      done: numFiles > 0 && numFiles <= 10 && numLines <= 400,
      hint: "Split large changes into smaller, reviewable PRs.",
      weight: 20,
    },
    {
      id: "summary",
      label: "Description / summary provided",
      done: summary.trim().length >= 30,
      hint: "Explain the motivation and approach in at least a sentence or two.",
      weight: 15,
    },
    {
      id: "tests",
      label: "Mentions tests / test coverage",
      done: /\btest|spec|coverage\b/.test(lowerSummary + " " + lowerTitle),
      hint: "State how the change is tested or add tests.",
      weight: 15,
    },
    {
      id: "issue-link",
      label: "Linked GitHub issue",
      done: issue.valid,
      hint: "Paste a github.com owner/repo/issues/N link so maintainers see context.",
      weight: 15,
    },
    {
      id: "no-redflags",
      label: "No red-flag terms (WIP, hack, temporary)",
      done: !/\bwip\b|\bhack\b|\btemporary\b|\bquick fix\b/.test(lowerTitle + " " + lowerSummary),
      hint: "Remove WIP/hack wording before requesting review.",
      weight: 10,
    },
  ];
}

export default function PrReadinessPage() {
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState("");
  const [lines, setLines] = useState("");
  const [summary, setSummary] = useState("");
  const [issueLink, setIssueLink] = useState("");

  const checklist = useMemo(
    () => buildChecklist(title, files, lines, summary, issueLink),
    [title, files, lines, summary, issueLink]
  );

  const score = useMemo(() => {
    const total = checklist.reduce((acc, c) => acc + c.weight, 0);
    const earned = checklist.reduce((acc, c) => acc + (c.done ? c.weight : 0), 0);
    return Math.round((earned / total) * 100);
  }, [checklist]);

  const probability =
    score >= 80
      ? { label: "Very likely accepted", color: "text-emerald-600", bar: "bg-emerald-500" }
      : score >= 55
        ? { label: "Promising - polish a few items", color: "text-amber-600", bar: "bg-amber-500" }
        : score > 0
          ? { label: "Needs work before opening", color: "text-orange-600", bar: "bg-orange-500" }
          : { label: "Start filling in details", color: "text-zinc-500", bar: "bg-zinc-400" };

  const issue = parseIssueLink(issueLink);

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-dark flex items-center gap-3">
          <Gauge className="w-8 h-8 text-brand-dark" aria-hidden />
          PR Readiness Simulator
        </h1>
        <p className="mt-2 text-zinc-600">
          Paste your PR title, diff size, summary, or issue link - get an instant acceptance score
          and a tailored checklist before you open the PR.
        </p>

        <section className="mt-6 p-6 bg-white border-2 border-brand-dark rounded-2xl shadow-[4px_4px_0px_#222831] space-y-4">
          <div>
            <label htmlFor="pr-title" className="flex items-center gap-1.5 text-sm font-semibold text-brand-dark mb-1">
              <Type className="w-4 h-4" aria-hidden /> PR title
            </label>
            <input
              id="pr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="feat: add retry logic to webhook delivery"
              className="w-full px-3 py-2 rounded-xl border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-dark"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="diff-files" className="flex items-center gap-1.5 text-sm font-semibold text-brand-dark mb-1">
                <FileDiff className="w-4 h-4" aria-hidden /> Files changed
              </label>
              <input
                id="diff-files"
                type="number"
                min={0}
                value={files}
                onChange={(e) => setFiles(e.target.value)}
                placeholder="e.g. 3"
                className="w-full px-3 py-2 rounded-xl border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-dark"
              />
            </div>
            <div>
              <label htmlFor="diff-lines" className="text-sm font-semibold text-brand-dark mb-1 block">
                Lines changed
              </label>
              <input
                id="diff-lines"
                type="number"
                min={0}
                value={lines}
                onChange={(e) => setLines(e.target.value)}
                placeholder="e.g. 120"
                className="w-full px-3 py-2 rounded-xl border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-dark"
              />
            </div>
          </div>

          <div>
            <label htmlFor="pr-summary" className="block text-sm font-semibold text-brand-dark mb-1">
              Diff summary / description
            </label>
            <textarea
              id="pr-summary"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What changed, why, and how it was tested…"
              className="w-full px-3 py-2 rounded-xl border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-dark"
            />
          </div>

          <div>
            <label htmlFor="issue-link" className="flex items-center gap-1.5 text-sm font-semibold text-brand-dark mb-1">
              <Link2 className="w-4 h-4" aria-hidden /> Issue link (GitHub)
            </label>
            <input
              id="issue-link"
              value={issueLink}
              onChange={(e) => setIssueLink(e.target.value)}
              placeholder="https://github.com/owner/repo/issues/123"
              className={`w-full px-3 py-2 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-brand-dark ${
                issueLink && !issue.valid ? "border-red-500" : "border-brand-dark"
              }`}
            />
            {issueLink && !issue.valid && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" aria-hidden /> Not a valid github.com issue URL
              </p>
            )}
            {issue.valid && (
              <p className="mt-1 text-xs text-emerald-600">
                Linked: {issue.repo}#{issue.number}
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 p-6 bg-white border-2 border-brand-dark rounded-2xl shadow-[4px_4px_0px_#222831]" aria-live="polite">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" aria-hidden /> Acceptance score
            </h2>
            <span data-testid="score-value" className="text-3xl font-extrabold text-brand-dark">
              {score}%
            </span>
          </div>
          <div className="w-full h-4 rounded-full bg-zinc-200 overflow-hidden border border-brand-dark">
            <div
              data-testid="score-bar"
              className={`h-full ${probability.bar} transition-all duration-300`}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className={`mt-2 text-sm font-semibold ${probability.color}`}>{probability.label}</p>

          <h3 className="mt-5 mb-2 text-sm font-bold uppercase tracking-wide text-zinc-500">
            Tailored checklist
          </h3>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" aria-label="done" />
                ) : (
                  <Circle className="w-5 h-5 mt-0.5 text-zinc-400 shrink-0" aria-label="todo" />
                )}
                <span>
                  <span className={item.done ? "text-zinc-800 font-medium" : "text-zinc-600"}>{item.label}</span>
                  {!item.done && <span className="block text-xs text-zinc-500">{item.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
