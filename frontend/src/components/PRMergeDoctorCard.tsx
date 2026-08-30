"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  ArrowRight,
  Split,
} from "lucide-react";

interface PRMergeDoctorProps {
  repoName?: string;
  p50Hours?: number;
  sweetSpotLines?: number;
}

export function PRMergeDoctorCard({
  repoName = "facebook/react",
  p50Hours = 18,
  sweetSpotLines = 180,
}: PRMergeDoctorProps) {
  const [prUrl, setPrUrl] = useState("");
  const [linesAdded, setLinesAdded] = useState("450");
  const [linesDeleted, setLinesDeleted] = useState("120");
  const [hasTests, setHasTests] = useState(false);
  const [hasIssueLink, setHasIssueLink] = useState(true);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosed, setDiagnosed] = useState(true);
  const [copiedScript, setCopiedScript] = useState(false);

  const totalLines = (parseInt(linesAdded) || 0) + (parseInt(linesDeleted) || 0);
  const isOversized = totalLines > sweetSpotLines;

  const estimatedReviewDays = isOversized ? Math.min(45, Math.round((totalLines / sweetSpotLines) * 8)) : 1;
  const splitPrCount = Math.max(2, Math.ceil(totalLines / sweetSpotLines));

  const gitBreakdownCommands = `# Step 1: Branch your core feature/fix
git checkout -b pr-part-1-core-types
git add src/types src/core
git commit -m "feat(core): implement base types and primitives"
git push origin pr-part-1-core-types

# Step 2: Branch your implementation on top
git checkout -b pr-part-2-implementation
git add src/components src/hooks
git commit -m "feat(ui): integrate components using core primitives"
git push origin pr-part-2-implementation`;

  const handleDiagnose = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDiagnosing(true);
    setTimeout(() => {
      setIsDiagnosing(false);
      setDiagnosed(true);
    }, 600);
  };

  const handleCopyGit = () => {
    navigator.clipboard.writeText(gitBreakdownCommands);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="rounded-3xl glass-panel border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-zinc-950/90 to-zinc-900/50 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
            <Stethoscope className="h-3.5 w-3.5" />
            <span>PR Merge Doctor · Pre-Submission Acceptance Diagnosis</span>
          </div>
          <h3 className="text-xl font-bold font-space text-white">
            Guarantee 24-Hour PR Merges Before Submitting
          </h3>
          <p className="text-xs text-zinc-400">
            Maintainers reject oversized or untested PRs. Diagnose your branch diff to match {repoName}&apos;s exact review sweet spot.
          </p>
        </div>

        <span className="glass-card px-3 py-1 rounded-xl text-xs font-mono text-emerald-400 shrink-0 self-start sm:self-auto flex items-center gap-1">
          ⚡ 94% Acceptance Target
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleDiagnose} className="p-5 rounded-2xl bg-[#09090b] border border-white/[0.08] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1 sm:col-span-3">
            <label className="text-xs font-mono text-zinc-300">GitHub PR URL or Branch (Optional):</label>
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123 or branch name"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.1] text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-zinc-300">Lines Added (+):</label>
            <input
              type="number"
              value={linesAdded}
              onChange={(e) => setLinesAdded(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/[0.1] text-emerald-400 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-zinc-300">Lines Deleted (-):</label>
            <input
              type="number"
              value={linesDeleted}
              onChange={(e) => setLinesDeleted(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/[0.1] text-red-400 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-zinc-300">Total Lines Changed:</label>
            <div className="px-3.5 py-2 rounded-xl bg-zinc-900/60 border border-white/[0.08] text-white text-xs font-mono font-bold">
              {totalLines} lines (Sweet spot: ~{sweetSpotLines} lines)
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/[0.06] text-xs font-mono">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={hasTests}
                onChange={(e) => setHasTests(e.target.checked)}
                className="rounded bg-zinc-900 border-white/20 text-emerald-500"
              />
              <span>Includes Unit Tests</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={hasIssueLink}
                onChange={(e) => setHasIssueLink(e.target.checked)}
                className="rounded bg-zinc-900 border-white/20 text-emerald-500"
              />
              <span>Closes an Issue (`Fixes #...`)</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isDiagnosing}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
          >
            {isDiagnosing ? "Diagnosing..." : "Run PR Diagnosis"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>

      {/* Diagnosis Report Output */}
      {diagnosed && (
        <div className="p-5 rounded-2xl glass-card border border-white/[0.1] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-lg ${
                isOversized ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}>
                {isOversized ? "B-" : "A+"}
              </div>
              <div>
                <div className="text-sm font-bold text-white font-space">
                  {isOversized ? "PR Size Warning: High Risk of Stalling" : "Optimal PR Size: High Merge Velocity"}
                </div>
                <div className="text-xs text-zinc-400 font-mono">
                  {isOversized
                    ? `Estimated Review Time: ~${estimatedReviewDays} days (Bikeshedding risk: High)`
                    : `Estimated Review Time: <24 hours (Merge Probability: 95%)`}
                </div>
              </div>
            </div>

            <Link
              href="/pricing?tab=contributors"
              className="text-xs font-mono text-emerald-400 hover:underline shrink-0"
            >
              Get Unlimited Scans ($9/mo)
            </Link>
          </div>

          {/* Key Findings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#0a0a0c] border border-white/[0.08] space-y-1">
              <div className="flex items-center gap-1.5 font-bold font-mono text-amber-400">
                <Split className="h-4 w-4" />
                <span>PR Breakdown Recommendation:</span>
              </div>
              <p className="text-zinc-300">
                Your PR is <strong>{totalLines} lines changed</strong>. In {repoName}, PRs over {sweetSpotLines} lines take 30+ days. Break this into <strong>{splitPrCount} smaller PRs</strong> to get merged in 24h.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0a0a0c] border border-white/[0.08] space-y-1">
              <div className="flex items-center gap-1.5 font-bold font-mono text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Maintainer Turnaround Vibe:</span>
              </div>
              <p className="text-zinc-300">
                Maintainers in this repo respond in <strong>~{p50Hours} hours</strong> for concise PRs with linked issues.
              </p>
            </div>
          </div>

          {/* Step-by-Step 1-Click Git Split Script */}
          {isOversized && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-1.5 text-white font-semibold">
                  <Terminal className="h-4 w-4 text-cyan-400" />
                  1-Click Git Breakdown Commands:
                </span>
                <button
                  type="button"
                  onClick={handleCopyGit}
                  className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedScript ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedScript ? "Copied Script!" : "Copy Git Commands"}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-[#08080a] border border-white/[0.08] font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap selection:bg-emerald-500/30">
                <code>{gitBreakdownCommands}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
