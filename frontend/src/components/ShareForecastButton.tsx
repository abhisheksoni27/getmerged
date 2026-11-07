"use client";

import React, { useState, useCallback } from "react";
import { Share2, Check, Copy, ExternalLink, Lock } from "lucide-react";
import posthog from "posthog-js";
import { getReferralCode } from "@/lib/referral";
import { buildTwitterIntent, buildLinkedInIntent } from "@/lib/pr-forecast-share";

interface ShareForecastButtonProps {
  evalId?: string;
  repoFullName: string;
  prNumber?: number | null;
  overallScore?: number | null;
  readyToMerge?: boolean | null;
  isPrivate?: boolean;
  className?: string;
  variant?: "button" | "compact";
}

export function ShareForecastButton({
  evalId,
  repoFullName,
  prNumber,
  overallScore,
  readyToMerge,
  isPrivate = false,
  className = "",
  variant = "button",
}: ShareForecastButtonProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  // Generate deterministic/unique evaluation ID
  const effectiveEvalId =
    evalId ||
    `eval_${encodeURIComponent(repoFullName).replace(/[^a-zA-Z0-9]/g, "_")}${
      prNumber ? `_${prNumber}` : ""
    }_${Date.now()}`;

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn("navigator.clipboard failed, attempting fallback:", err);
      }
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error("Clipboard copy fallback failed:", err);
      return false;
    }
  }, []);

  const getShareLinks = useCallback(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_SITE_URL || "https://getmerged.abhishekco.de");
    const refCode = getReferralCode() || undefined;

    const cleanScore = overallScore !== undefined && overallScore !== null ? overallScore : 75;
    const verdict = readyToMerge
      ? "PRE-FLIGHT READY"
      : readyToMerge === false
      ? "ADJUSTMENTS RECOMMENDED"
      : cleanScore >= 70
      ? "PRE-FLIGHT READY"
      : "ADJUSTMENTS RECOMMENDED";

    // Public share destination (/share/pr-eval/[id]) carrying referral and repo params
    const destinationUrl = `${origin}/share/pr-eval/${encodeURIComponent(
      effectiveEvalId
    )}?repo=${encodeURIComponent(repoFullName)}&score=${cleanScore}&verdict=${encodeURIComponent(
      verdict
    )}${prNumber ? `&pr_number=${prNumber}` : ""}${
      refCode ? `&ref=${encodeURIComponent(refCode)}` : ""
    }`;

    // Dynamic OG Card URL endpoint
    const ogCardUrl = `${origin}/api/og/pr-eval/${encodeURIComponent(
      effectiveEvalId
    )}?repo=${encodeURIComponent(repoFullName)}&score=${cleanScore}&verdict=${encodeURIComponent(
      verdict
    )}`;

    const shareText = `Just ran a Pre-flight PR forecast for ${repoFullName} on @GetMerged! ${
      overallScore !== undefined && overallScore !== null
        ? `Score: ${Math.round(overallScore)}/100.`
        : ""
    } Verdict: ${verdict}. Check contributor readiness:`;

    const xIntent = buildTwitterIntent(shareText, destinationUrl);
    const linkedInIntent = buildLinkedInIntent(destinationUrl);

    return {
      destinationUrl,
      ogCardUrl,
      xIntent,
      linkedInIntent,
      shareText,
      verdict,
      cleanScore,
      refCode,
    };
  }, [effectiveEvalId, repoFullName, overallScore, readyToMerge, prNumber]);

  const handleShareClick = async () => {
    if (isPrivate) return;

    const { destinationUrl, verdict, cleanScore, refCode } = getShareLinks();

    // Persist public evaluation payload (AC2)
    try {
      fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: effectiveEvalId,
          repo: repoFullName,
          pr_number: prNumber || null,
          score: cleanScore,
          verdict,
          referrer_id: refCode || null,
          timestamp: Date.now(),
        }),
      }).catch((e) => console.warn("Failed to persist evaluation to KV:", e));
    } catch (e) {
      console.warn("KV persist error:", e);
    }

    const success = await copyToClipboard(destinationUrl);

    if (success) {
      setCopied(true);
      setToastMessage("Share URL copied to clipboard!");
      setTimeout(() => {
        setCopied(false);
        setToastMessage(null);
      }, 3000);

      posthog.capture("forecast_result_shared", {
        repo: repoFullName,
        eval_id: effectiveEvalId,
        score: overallScore,
        ready_to_merge: readyToMerge,
      });
    }

    setOpenModal(true);
  };

  // AC1: Button disabled with tooltip for private repos
  if (isPrivate) {
    return (
      <div className="relative inline-block group">
        <button
          type="button"
          disabled
          data-testid="share-result-btn-disabled"
          aria-disabled="true"
          title="Sharing is disabled for private repositories to protect code confidentiality"
          className={
            variant === "compact"
              ? `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg glass-card text-[var(--text-secondary)] border border-[var(--border-subtle)] cursor-not-allowed opacity-60 ${className}`
              : `inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card border-2 border-[var(--border-subtle)] text-[var(--text-secondary)] font-mono font-bold text-xs uppercase tracking-wider cursor-not-allowed opacity-60 ${className}`
          }
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Share result</span>
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 w-56 p-2 glass-card text-[var(--text-primary)] text-[11px] font-sans rounded-lg shadow-lg text-center">
          Sharing is disabled for private repositories to protect code confidentiality.
        </div>
      </div>
    );
  }

  const { xIntent, linkedInIntent, destinationUrl } = getShareLinks();

  return (
    <div className="relative inline-block">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          data-testid="share-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 glass-card text-[var(--text-primary)] text-xs font-mono font-semibold px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] shadow-xl transition-all animate-bounce"
        >
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {variant === "compact" ? (
        <button
          type="button"
          onClick={handleShareClick}
          data-testid="share-result-btn"
          aria-label={`Share result forecast for ${repoFullName}`}
          title="Share forecast result (X & LinkedIn intents)"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg glass-card text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-[0.98] ${className}`}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 text-[var(--text-secondary)]" />}
          <span>{copied ? "Copied Link!" : "Share result"}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleShareClick}
          data-testid="share-result-btn"
          aria-label={`Share result forecast for ${repoFullName}`}
          title="Share forecast result (X & LinkedIn intents)"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-panel border-2 border-[var(--border-subtle)] text-[var(--text-primary)] font-mono font-bold text-xs uppercase tracking-wider hover:glass-card active:scale-[0.98] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${className}`}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4 text-[var(--text-secondary)]" />}
          <span>{copied ? "URL Copied to Clipboard!" : "Share result"}</span>
        </button>
      )}

      {/* Share Modal Dialog with X & LinkedIn intents */}
      {openModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-surface)] backdrop-blur-xs"
          onClick={() => setOpenModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl glass-panel border-2 border-[var(--border-subtle)] p-6 shadow-sm font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-emerald-600" />
                <h3 className="font-space font-bold text-base text-[var(--text-primary)]">Share PR Evaluation</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-secondary)] text-sm font-mono font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] mb-4 font-sans">
              Social share card generated with C-Rank attribution and referral credits.
            </p>

            <div className="space-y-3 mb-5">
              <a
                href={xIntent}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="share-x-intent"
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl glass-card hover:bg-black text-white text-xs font-mono font-bold transition-all shadow-sm"
              >
                <span>Share on X (Twitter)</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <a
                href={linkedInIntent}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="share-linkedin-intent"
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-[#0077b5] hover:bg-[#006396] text-white text-xs font-mono font-bold transition-all shadow-sm"
              >
                <span>Share on LinkedIn</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <label className="block text-[11px] font-mono font-bold text-[var(--text-secondary)] uppercase mb-1">
                Direct Share Link (with referral attribution)
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={destinationUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 rounded-xl border border-[var(--border-subtle)] glass-card px-3 py-2 text-xs font-mono text-[var(--text-secondary)]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyToClipboard(destinationUrl);
                    if (ok) {
                      setCopied(true);
                      setToastMessage("Link copied!");
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="px-3 py-2 rounded-xl glass-card border border-[var(--border-subtle)] hover:bg-zinc-200 text-xs font-mono font-bold text-[var(--text-secondary)] flex items-center gap-1 shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
