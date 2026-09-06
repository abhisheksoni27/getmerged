"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send, ShieldAlert, X } from "lucide-react";

interface DisputeModalProps {
  fullName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DisputeModal({ fullName, isOpen, onClose }: DisputeModalProps) {
  const [email, setEmail] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [reason, setReason] = useState("stale_metric");
  const [details, setDetails] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      setError("Please describe why you believe this score or metric is inaccurate.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_full_name: fullName,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-white/[0.12] rounded-2xl shadow-2xl p-6 text-white font-sans overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-base font-bold font-space text-white">Dispute Score &amp; Telemetry</h2>
              <p className="text-xs font-mono text-zinc-400">{fullName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold font-space text-white">Dispute Filed Under 48h SLA</h3>
            <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
              Your inquiry has been submitted directly to the engineering review queue. If your evidence indicates crawler discrepancy or bot pollution, we trigger an out-of-band re-scan and post an entry to our public changelog.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-zinc-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 leading-relaxed font-sans">
                <span className="font-semibold">48-Hour SLA Guarantee:</span> Every report is reviewed by a human engineer against raw GitHub pull request logs. We do not punish repos for candid disputes.
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="dispute-reason" className="block text-xs font-mono text-zinc-300 mb-1">
                Dispute Category *
              </label>
              <select
                id="dispute-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.1] text-xs text-white focus:outline-hidden focus:border-amber-400"
              >
                <option value="stale_metric">Stale or outdated snapshot metrics</option>
                <option value="bot_pollution">Automated bots counted as external PRs</option>
                <option value="maintainer_count">Maintainer team count is inaccurate</option>
                <option value="unmerged_explanation">High volume of invalid/spam PRs closed</option>
                <option value="other">Other methodology disagreement</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="dispute-github" className="block text-xs font-mono text-zinc-300 mb-1">
                  Your GitHub Username
                </label>
                <input
                  id="dispute-github"
                  type="text"
                  placeholder="e.g. octocat"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.1] text-xs text-white focus:outline-hidden focus:border-amber-400 font-mono"
                />
              </div>
              <div>
                <label htmlFor="dispute-email" className="block text-xs font-mono text-zinc-300 mb-1">
                  Email (for status updates)
                </label>
                <input
                  id="dispute-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.1] text-xs text-white focus:outline-hidden focus:border-amber-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dispute-evidence" className="block text-xs font-mono text-zinc-300 mb-1">
                Evidence Link (PR, commit, issue URL)
              </label>
              <input
                id="dispute-evidence"
                type="url"
                placeholder="https://github.com/.../pull/..."
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.1] text-xs text-white focus:outline-hidden focus:border-amber-400 font-mono"
              />
            </div>

            <div>
              <label htmlFor="dispute-details" className="block text-xs font-mono text-zinc-300 mb-1">
                Explanation &amp; Findings *
              </label>
              <textarea
                id="dispute-details"
                rows={3}
                required
                placeholder="Provide context on what numbers look wrong and why..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.1] text-xs text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black font-mono text-xs font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Submit Dispute (48h SLA)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
