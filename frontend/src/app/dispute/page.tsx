"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Send,
  Loader2,
  FileCheck2,
} from "lucide-react";

export default function DisputePage() {
  const [repoFullName, setRepoFullName] = useState("");
  const [email, setEmail] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [reason, setReason] = useState("stale_metric");
  const [details, setDetails] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoFullName.trim() || !details.trim()) {
      setError("Repository name and details are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_full_name: repoFullName.trim(),
          email: email.trim() || undefined,
          github_username: githubUsername.trim() || undefined,
          reason,
          details: details.trim(),
          evidence_url: evidenceUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit dispute. Please try again.");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent dev-grid-pattern text-white font-sans">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {/* Header Hero */}
        <div className="rounded-3xl surface-base p-8 sm:p-10 border border-[var(--border-subtle)] shadow-xs mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-xs font-semibold mb-4">
            <ShieldAlert className="h-3.5 w-3.5" /> Maintainer Integrity Guarantee
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-space text-[var(--text-primary)] tracking-tight">
            Report a Score or Telemetry Dispute
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            We score 102,000+ repositories purely from public GitHub GraphQL signals. If bot pollution, spam storms, or crawler lag created an inaccurate C-Rank grade for your repository, report it directly below.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <Clock className="h-4 w-4" /> 48-Hour Human SLA
            </span>
            <span className="inline-flex items-center gap-1.5 text-blue-400">
              <FileCheck2 className="h-4 w-4" /> Public Methodology Changelog
            </span>
            <Link prefetch={false}
              href="/methodology/changelog"
              className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
            >
              View Recalibration Log <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Form Container */}
        <div className="rounded-2xl surface-base p-6 sm:p-8 border border-[var(--border-subtle)] shadow-xs">
          {success ? (
            <div className="py-12 text-center space-y-4">
              <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto" />
              <h2 className="text-2xl font-bold font-space text-[var(--text-primary)]">Dispute Received Under 48h SLA</h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                Thank you for contributing to open-source data integrity. An engineer will inspect the historical pull-request events for <span className="font-mono text-amber-300">{repoFullName}</span>.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setDetails("");
                    setRepoFullName("");
                  }}
                  className="px-5 py-2.5 rounded-xl surface-base border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Submit Another
                </button>
                <Link prefetch={false}
                  href="/repos"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white text-black text-xs font-mono font-bold hover:bg-zinc-200 transition-colors"
                >
                  <span>Explore Directory</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200 leading-relaxed font-sans">
                  <span className="font-bold">Transparent Resolution:</span> Validated discrepancies trigger an immediate manual rescan and recalculation. Results and explanations are published to the methodology changelog.
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="repo-input" className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5">
                  Repository Full Name or GitHub URL *
                </label>
                <input
                  id="repo-input"
                  type="text"
                  required
                  placeholder="e.g. facebook/react or https://github.com/gin-gonic/gin"
                  value={repoFullName}
                  onChange={(e) => setRepoFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-[var(--border-subtle)] text-sm text-white placeholder-zinc-500 font-mono focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category-select" className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5">
                    Dispute Reason / Category *
                  </label>
                  <select
                    id="category-select"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-[var(--border-subtle)] text-sm text-white focus:outline-hidden focus:border-amber-400 font-sans"
                  >
                    <option value="stale_metric">Stale / outdated metrics</option>
                    <option value="bot_pollution">Automated bots counted as external PRs</option>
                    <option value="maintainer_count">Maintainer team count is inaccurate</option>
                    <option value="unmerged_explanation">Mass spam/invalid PR storm closed</option>
                    <option value="other">Other scoring discrepancy</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="github-user" className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5">
                    Your GitHub Username (optional)
                  </label>
                  <input
                    id="github-user"
                    type="text"
                    placeholder="octocat"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-[var(--border-subtle)] text-sm text-white placeholder-zinc-500 font-mono focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5">
                    Contact Email (for resolution notification)
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    placeholder="maintainer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-[var(--border-subtle)] text-sm text-white placeholder-zinc-500 font-mono focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                <div>
                  <label htmlFor="evidence-link" className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5">
                    Evidence Link (PR, issue, or discussion)
                  </label>
                  <input
                    id="evidence-link"
                    type="url"
                    placeholder="https://github.com/..."
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-[var(--border-subtle)] text-sm text-white placeholder-zinc-500 font-mono focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="dispute-explanation" className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5">
                  Detailed Findings &amp; Context *
                </label>
                <textarea
                  id="dispute-explanation"
                  rows={4}
                  required
                  placeholder="Explain why the current metric is incorrect, e.g. 'We merge outside PRs into develop instead of main' or 'A spam campaign submitted 40 bogus PRs that were mass-closed in July'..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900/80 border border-[var(--border-subtle)] text-sm text-white placeholder-zinc-500 focus:outline-hidden focus:border-amber-400 font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <Link prefetch={false}
                  href="/how-c-rank-works"
                  className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  Review C-Rank Methodology &rarr;
                </Link>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-400 text-black font-mono text-xs font-bold hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>Submit Dispute (48h SLA)</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
