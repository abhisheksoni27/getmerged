"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Sparkles, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface CheckItem {
  key: string;
  title: string;
  passed: boolean;
  description: string;
  severity: "error" | "warning" | "info";
  suggestion: string;
}

interface EvaluationResult {
  overall_score: number;
  ready_to_merge: boolean;
  summary: string;
  checks: CheckItem[];
}

export default function PreflightPage() {
  const [repoFullName, setRepoFullName] = useState("");
  const [prTitle, setPRTitle] = useState("");
  const [prDescription, setPRDescription] = useState("");
  const [changedFilesText, setChangedFilesText] = useState("");
  const [additions, setAdditions] = useState<number | "">("");
  const [deletions, setDeletions] = useState<number | "">("");
  const [linkedIssueURL, setLinkedIssueURL] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const changedFiles = changedFilesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/preflight/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_full_name: repoFullName,
          pr_title: prTitle,
          pr_description: prDescription,
          changed_files: changedFiles,
          additions: Number(additions) || 0,
          deletions: Number(deletions) || 0,
          linked_issue_url: linkedIssueURL,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error("Preflight evaluation failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-zinc-900">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Static Heuristic PR Pre-Flight Checklist</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-space text-zinc-900 tracking-tight">
            PR Acceptance Pre-Flight Evaluator
          </h1>
          <p className="text-sm text-zinc-600 font-sans mt-2 max-w-2xl">
            Test your pull request against repository conventions, test coverage heuristics, and size limits before opening it upstream.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleEvaluate} className="rounded-2xl bg-white p-5 sm:p-6 border-2 border-brand-dark shadow-[4px_4px_0px_#222831] mb-8 font-sans">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 font-mono">
                Target Repository
              </label>
              <input
                type="text"
                placeholder="e.g. facebook/react"
                value={repoFullName}
                onChange={(e) => setRepoFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 font-mono">
                Linked Issue URL (Optional)
              </label>
              <input
                type="text"
                placeholder="https://github.com/owner/repo/issues/123"
                value={linkedIssueURL}
                onChange={(e) => setLinkedIssueURL(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 font-mono">
              Pull Request Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. fix(core): resolve null pointer exception in parser"
              value={prTitle}
              onChange={(e) => setPRTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 font-mono">
              Pull Request Description / Summary
            </label>
            <textarea
              rows={3}
              placeholder="Explain what this PR solves, regression testing performed, and upstream bug context..."
              value={prDescription}
              onChange={(e) => setPRDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 font-mono">
                Changed Files (One per line)
              </label>
              <textarea
                rows={3}
                placeholder={"src/parser.ts\nsrc/parser.test.ts"}
                value={changedFilesText}
                onChange={(e) => setChangedFilesText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1 font-mono">
                  + Additions
                </label>
                <input
                  type="number"
                  placeholder="25"
                  value={additions}
                  onChange={(e) => setAdditions(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm rounded-xl border border-zinc-300 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1 font-mono">
                  - Deletions
                </label>
                <input
                  type="number"
                  placeholder="5"
                  value={deletions}
                  onChange={(e) => setDeletions(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm rounded-xl border border-zinc-300 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-dark text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_#000]"
          >
            {loading ? "Evaluating PR..." : "Run Pre-Flight Check"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Results Section */}
        {result && (
          <div className="rounded-2xl bg-white p-5 sm:p-6 border-2 border-brand-dark shadow-[4px_4px_0px_#222831] mb-8 font-sans">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {result.ready_to_merge ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
                      <CheckCircle2 className="h-3.5 w-3.5" /> PRE-FLIGHT READY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-mono">
                      <AlertTriangle className="h-3.5 w-3.5" /> ADJUSTMENTS RECOMMENDED
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-zinc-800">{result.summary}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-zinc-900">
                  {result.overall_score.toFixed(0)}
                  <span className="text-sm text-zinc-400">/100</span>
                </div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Pre-flight Score</div>
              </div>
            </div>

            <div className="space-y-3">
              {result.checks.map((c) => (
                <div
                  key={c.key}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    c.passed ? "bg-emerald-50/40 border-emerald-200" : c.severity === "error" ? "bg-rose-50/40 border-rose-200" : "bg-amber-50/40 border-amber-200"
                  }`}
                >
                  <div className="mt-0.5">
                    {c.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : c.severity === "error" ? (
                      <XCircle className="h-4 w-4 text-rose-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-900 font-mono">{c.title}</h4>
                      <span className="text-[10px] font-mono uppercase text-zinc-500">{c.passed ? "Pass" : c.severity}</span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">{c.description}</p>
                    <p className="text-xs text-zinc-700 font-medium mt-1 bg-white/70 p-2 rounded-lg border border-zinc-200/60 font-mono">
                      💡 {c.suggestion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
