"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Sparkles, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { ShareForecastButton } from "@/components/ShareForecastButton";

interface CheckItem {
  key: string;
  title: string;
  passed: boolean;
  description: string;
  severity: "error" | "warning" | "info";
  suggestion: string;
  fixes?: Fix[];
}

// Fix is a concrete, one-click repair suggestion returned by the backend for
// failed/warn checks (AC1-AC3).
interface Fix {
  type: "issue_link" | "pr_title_body" | "conventional_commit" | "missing_tests";
  label: string;
  payload: string;
  apply_url?: string;
  apply_method: "deep_link" | "clipboard_deeplink" | "clipboard";
}

interface EvaluationResult {
  overall_score: number;
  ready_to_merge: boolean;
  summary: string;
  checks: CheckItem[];
}

function parseRepoParam(param: string | null): string {
  if (!param) return "";
  try {
    return decodeURIComponent(param).trim();
  } catch {
    return param.trim();
  }
}

// copyToClipboard writes text with a navigator.clipboard primary path and an
// execCommand('copy') fallback (AC6). Returns true on success.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// FixActions renders Copy/Apply controls for one backend fix (AC6). 'Apply'
// opens the GitHub deep link via window.open, falling back to a visible anchor
// when a popup blocker suppresses the new window. 'Copy' shows a transient
// "Copied" state and surfaces an error if the clipboard write fails.
function FixActions({ fix }: { fix: Fix }) {
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState(false);
  const [applyBlocked, setApplyBlocked] = React.useState(false);

  const handleCopy = async () => {
    setCopyError(false);
    const ok = await copyToClipboard(fix.payload);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(true);
    }
  };

  const handleApply = () => {
    setApplyBlocked(false);
    if (!fix.apply_url) {
      void handleCopy();
      return;
    }
    let win: Window | null = null;
    try {
      win = window.open(fix.apply_url, "_blank", "noopener,noreferrer");
    } catch {
      win = null;
    }
    if (!win) {
      // Popup blocker (or no window.open): surface a clickable fallback link.
      setApplyBlocked(true);
      return;
    }
    if (fix.apply_method === "clipboard_deeplink") {
      void handleCopy();
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        data-testid={`copy-fix-${fix.type}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e293b] text-white font-mono text-[10px] uppercase tracking-wider hover:bg-zinc-800 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      {fix.apply_url ? (
        <button
          type="button"
          onClick={handleApply}
          data-testid={`apply-fix-${fix.type}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-mono text-[10px] uppercase tracking-wider hover:bg-emerald-700 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          Apply
        </button>
      ) : null}
      {applyBlocked && fix.apply_url ? (
        <a
          href={fix.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`apply-fallback-${fix.type}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg underline text-emerald-400 font-mono text-[10px] uppercase tracking-wider"
        >
          Open link
        </a>
      ) : null}
      {copyError ? (
        <span
          role="alert"
          data-testid={`copy-error-${fix.type}`}
          className="text-[10px] font-mono text-rose-600"
        >
          Copy failed - select the text manually.
        </span>
      ) : null}
      {fix.apply_method === "clipboard_deeplink" && fix.apply_url ? (
        <span className="text-[10px] font-mono text-zinc-400">
          Then paste into the PR edit page.
        </span>
      ) : null}
    </div>
  );
}

function PreflightSkeleton() {
  return (
    <div
      data-testid="preflight-suspense-fallback"
      className="p-6 sm:p-8 bg-[#111827] border-2 border-white/[0.08] rounded-2xl shadow-sm animate-pulse mb-8 font-sans"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="h-3 w-28 bg-zinc-200 rounded mb-2" />
          <div className="h-10 bg-[#1e293b] rounded-xl" />
        </div>
        <div>
          <div className="h-3 w-36 bg-zinc-200 rounded mb-2" />
          <div className="h-10 bg-[#1e293b] rounded-xl" />
        </div>
      </div>
      <div className="mb-4">
        <div className="h-3 w-32 bg-zinc-200 rounded mb-2" />
        <div className="h-10 bg-[#1e293b] rounded-xl" />
      </div>
      <div className="mb-4">
        <div className="h-3 w-44 bg-zinc-200 rounded mb-2" />
        <div className="h-20 bg-[#1e293b] rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="sm:col-span-2">
          <div className="h-3 w-36 bg-zinc-200 rounded mb-2" />
          <div className="h-20 bg-[#1e293b] rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
          <div>
            <div className="h-3 w-16 bg-zinc-200 rounded mb-1" />
            <div className="h-9 bg-[#1e293b] rounded-xl" />
          </div>
          <div>
            <div className="h-3 w-16 bg-zinc-200 rounded mb-1" />
            <div className="h-9 bg-[#1e293b] rounded-xl" />
          </div>
        </div>
      </div>
      <div className="h-10 w-44 bg-zinc-200 rounded-xl" />
    </div>
  );
}

const PACK_CHECKOUT_URL = "https://checkout.dodopayments.com/buy/pdt_opendoor_pack10";
const PACK_PROCESSING_KEY = "preflight_pack_processing";

type PackWatch = "processing" | "granted" | "failed" | "timeout";

function PreflightContent() {
  const searchParams = useSearchParams();
  const queryRepo = searchParams
    ? searchParams.get("repo") || searchParams.get("repo_full_name")
    : null;

  const [repoFullName, setRepoFullName] = useState<string>(() => parseRepoParam(queryRepo));
  const [prUrl, setPRUrl] = useState<string>(() => {
    const raw = searchParams ? searchParams.get("pr_url") : null;
    return typeof raw === "string" ? raw.trim() : "";
  });
  const [prTitle, setPRTitle] = useState("");
  const [prDescription, setPRDescription] = useState("");
  const [changedFilesText, setChangedFilesText] = useState("");
  const [additions, setAdditions] = useState<number | "">("");
  const [deletions, setDeletions] = useState<number | "">("");
  const [linkedIssueURL, setLinkedIssueURL] = useState("");

  const [loading, setLoading] = useState(false);
  const [fetchingPR, setFetchingPR] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<{ message: string; remaining: number } | null>(null);
  // Anonymous trial state: one free evaluation per IP before GitHub sign-in
  // (aha-before-auth). Detected via the same non-httpOnly session cookie check
  // used by Header/HomeClient; falls back safely when document is unavailable.
  const [signedIn] = useState<boolean>(
    () => typeof document !== "undefined" && document.cookie.includes("opendoor_token=")
  );
  const [trialUsed, setTrialUsed] = useState(false);
  // Pay-as-you-go pack: set after returning from the DodoPayments checkout
  // while the webhook/reconcile pipeline grants the credits (AC4).
  const [packPending, setPackPending] = useState(false);
  const [packWatch, setPackWatch] = useState<PackWatch>("processing");
  const packOrderRef = useRef("");

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(PACK_PROCESSING_KEY);
      if (!raw) return;
      window.sessionStorage.removeItem(PACK_PROCESSING_KEY);
      try {
        const parsed: unknown = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof (parsed as { orderId?: unknown }).orderId === "string"
        ) {
          packOrderRef.current = (parsed as { orderId: string }).orderId;
        }
      } catch {
        // Legacy "1" flag or malformed value: banner-only fallback, no poll.
      }
      setPackPending(true);
    } catch {
      // sessionStorage unavailable (private mode, storage disabled): skip.
    }
  }, []);

  // AC6: after checkout success, poll the tracked order's credit grant until
  // confirmed or a 30s timeout shows the "may take a minute" fallback.
  useEffect(() => {
    if (!packPending) return;
    const orderId = packOrderRef.current;
    if (!orderId) return;
    let cancelled = false;
    const deadline = Date.now() + 30_000;
    const tick = async () => {
      while (!cancelled && Date.now() < deadline) {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/v1/credits/pack-status?orderId=${encodeURIComponent(orderId)}`,
            { credentials: "include" },
          );
          if (res.ok) {
            const data: unknown = await res.json().catch(() => null);
            const status =
              data && typeof data === "object"
                ? (data as { status?: unknown }).status
                : null;
            if (status === "paid") {
              if (!cancelled) setPackWatch("granted");
              return;
            }
            if (status === "failed") {
              if (!cancelled) setPackWatch("failed");
              return;
            }
          }
        } catch {
          // Network hiccup or auth blip: keep polling until the deadline.
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelled) setPackWatch("timeout");
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [packPending]);

  const handleBuyPack = async () => {
    try {
      window.sessionStorage.setItem(PACK_PROCESSING_KEY, JSON.stringify({ pending: true }));
    } catch {
      // Storage unavailable: checkout still proceeds without processing state.
    }
    let checkoutURL = PACK_CHECKOUT_URL;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/credits/pack-checkout`, {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
      });
      if (res.ok) {
        const data: unknown = await res.json().catch(() => null);
        if (data && typeof data === "object") {
          const { checkout_url, order_id } = data as {
            checkout_url?: unknown;
            order_id?: unknown;
          };
          if (typeof checkout_url === "string" && checkout_url) checkoutURL = checkout_url;
          if (typeof order_id === "string" && order_id) {
            try {
              window.sessionStorage.setItem(
                PACK_PROCESSING_KEY,
                JSON.stringify({ orderId: order_id }),
              );
            } catch {
              // Storage unavailable: status poll is skipped on return.
            }
          }
        }
      }
    } catch {
      // Checkout API unreachable/expired session: static hosted page fallback.
    } finally {
      clearTimeout(timer);
    }
    window.location.href = checkoutURL;
  };

  useEffect(() => {
    const rawParam = searchParams
      ? searchParams.get("repo") || searchParams.get("repo_full_name")
      : null;
    const sanitized = parseRepoParam(rawParam);
    if (sanitized && !repoFullName) {
      setRepoFullName(sanitized);
    }
  }, [searchParams, repoFullName]);

  const fetchPRDetails = useCallback(async (url: string) => {
    setFetchingPR(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/preflight/pr-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pr_url: url.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Failed to fetch PR details (status ${res.status})`);
      }
      const data = await res.json();
      if (data.repo_full_name && !repoFullName) {
        setRepoFullName(data.repo_full_name);
      }
      if (data.pr_title) setPRTitle(data.pr_title);
      if (data.pr_description) setPRDescription(data.pr_description);
      if (data.changed_files && Array.isArray(data.changed_files)) {
        setChangedFilesText(data.changed_files.join("\n"));
      }
      if (data.additions) setAdditions(data.additions);
      if (data.deletions) setDeletions(data.deletions);
    } catch (err) {
      console.error("Failed to fetch PR details", err);
      setError(err instanceof Error ? err.message : "Failed to fetch PR details.");
    } finally {
      setFetchingPR(false);
    }
  }, [repoFullName]);

  // Deep-link support: /preflight?pr_url=<html_url> prefills the PR URL input
  // and runs the existing auto-fetch flow once (title, description, files).
  const autoFetchedRef = useRef(false);
  useEffect(() => {
    if (autoFetchedRef.current) return;
    const raw = searchParams ? searchParams.get("pr_url") : null;
    const url = typeof raw === "string" ? raw.trim() : "";
    if (!url) return;
    autoFetchedRef.current = true;
    if (/github\.com\/.+\/.+\/pull\/\d+/i.test(url)) {
      void fetchPRDetails(url);
    }
  }, [searchParams, fetchPRDetails]);

  const performEvaluation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setUpgrade(null);

    const changedFiles = changedFilesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/preflight/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_full_name: repoFullName.trim(),
          pr_title: prTitle.trim(),
          pr_description: prDescription.trim(),
          changed_files: changedFiles,
          additions: Number(additions) || 0,
          deletions: Number(deletions) || 0,
          linked_issue_url: linkedIssueURL.trim(),
          pr_url: prUrl.trim(),
        }),
      });

      if (!res.ok) {
        if (res.status === 402 || res.status === 429) {
          // Anonymous visitors who exhausted their one-per-IP trial get the
          // sign-in gate instead of the Pro paywall.
          if (!signedIn) {
            setResult(null);
            setTrialUsed(true);
            return;
          }
          const errData = await res.json().catch(() => ({}));
          const evalsUsed =
            typeof errData?.evals_used === "number" ? errData.evals_used : 3;
          setUpgrade({
            message:
              errData?.error === "quota_exceeded"
                ? "Monthly free evaluation limit reached (3/3). Upgrade to Pro for unlimited evaluations."
                : errData?.error ||
                  "Monthly free evaluation quota exceeded (3/3). Upgrade to Pro for unlimited evaluations.",
            remaining: Math.max(0, 3 - evalsUsed),
          });
          return;
        }
        throw new Error(`Preflight evaluation failed with status ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setError(null);
      if (!signedIn) setTrialUsed(true);
    } catch (err) {
      console.error("Preflight evaluation failed", err);
      setError("Evaluation service is temporarily unavailable. Please verify your inputs and retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    await performEvaluation();
  };

  return (
    <>
      {/* Pro Quota Paywall Modal */}
      {upgrade && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#111827] border-2 border-white/[0.08] shadow-sm p-6 font-sans">
            <h2
              id="upgrade-modal-title"
              className="text-lg font-bold font-space text-zinc-100 tracking-tight mb-2"
            >
              Free Evaluations Used Up
            </h2>
            <p className="text-sm text-zinc-400 mb-4">{upgrade.message}</p>
            <div className="rounded-xl bg-[#1e293b] border border-white/[0.08] px-4 py-3 mb-5 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Evaluations remaining this month
              </span>
              <span data-testid="quota-remaining" className="text-xl font-bold font-mono text-zinc-100">
                {upgrade.remaining}
                <span className="text-sm text-zinc-400">/3</span>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/pricing"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-dark text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 active:scale-[0.98] transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Subscribe - $9/mo
              </Link>
              <button
                type="button"
                onClick={handleBuyPack}
                data-testid="buy-pack"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 active:scale-[0.98] transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Buy 10 credits for $5
              </button>
              <button
                type="button"
                onClick={() => setUpgrade(null)}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-white/[0.12] bg-[#111827] text-zinc-300 font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#1e293b] active:scale-[0.98] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Maybe Later
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-zinc-400 font-sans">
              One-time purchase. Pack credits never expire and stack on top of your monthly free evaluations.
            </p>
          </div>
        </div>
      )}

      {/* Pack purchase processing state (missed-webhook failure mode, AC4/AC6) */}
      {packPending && !upgrade && (
        <div
          role="status"
          data-testid="pack-processing"
          className="rounded-2xl bg-emerald-950/70 border-emerald-800/80/60 border border-emerald-200 p-4 mb-8 font-sans text-sm text-zinc-300"
        >
          {packWatch === "granted" ? (
            <>
              <span className="font-semibold text-zinc-100">10 credits added.</span> Your pack
              credits are ready - re-run your evaluation now.
            </>
          ) : packWatch === "failed" ? (
            <>
              <span className="font-semibold text-zinc-100">Payment not completed.</span> You were
              not charged for a pack - you can retry the purchase anytime from the paywall.
            </>
          ) : (
            <>
              <span className="font-semibold text-zinc-100">Payment processing.</span> Credits may
              take a minute to appear - re-run your evaluation shortly. Not credited within 24
              hours? Contact support for a refund or manual grant.
            </>
          )}
        </div>
      )}

      {/* Error & Retry Banner */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-2xl bg-[#fef2f2] p-5 sm:p-6 border-2 border-[#fecaca] shadow-sm mb-8 font-sans transition-all duration-150 ease-out"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <AlertTriangle className="h-5 w-5 text-[#dc2626]" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#991b1b] font-mono">
                  Evaluation Request Failed
                </h3>
                <p className="text-xs text-[#991b1b] mt-0.5 font-sans">
                  {error}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={performEvaluation}
              disabled={loading}
              aria-label="Retry evaluation"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#dc2626] text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#b91c1c] active:scale-[0.98] transition-all duration-100 disabled:opacity-50 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shrink-0"
            >
              {loading ? "Retrying..." : "Retry Evaluation"}
            </button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={handleEvaluate}
        className="rounded-2xl bg-[#111827] p-5 sm:p-6 border-2 border-white/[0.08] shadow-sm mb-8 font-sans"
      >
        <div className="mb-4">
          <label
            htmlFor="pr-url-input"
            className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono"
          >
            Pull Request URL (auto-fetch diff & metadata)
          </label>
          <div className="flex gap-2">
            <input
              id="pr-url-input"
              type="text"
              placeholder="https://github.com/owner/repo/pull/123"
              value={prUrl}
              onChange={(e) => setPRUrl(e.target.value)}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val && /github\.com\/.+\/.+\/pull\/\d+/i.test(val)) {
                  fetchPRDetails(val);
                }
              }}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-[#1e293b]/50 font-mono text-sm text-zinc-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:bg-[#111827] transition-all outline-none"
            />
            {fetchingPR && (
              <span className="inline-flex items-center px-3 py-2 rounded-xl bg-[#1e293b] text-zinc-400 text-xs font-mono">
                Fetching...
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 font-sans">
            Paste a GitHub PR link to auto-populate title, diff stats, and changed files.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              htmlFor="target-repo-input"
              className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono"
            >
              Target Repository
            </label>
            <input
              id="target-repo-input"
              type="text"
              placeholder="e.g. facebook/react"
              value={repoFullName}
              onChange={(e) => setRepoFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-[#1e293b]/50 font-mono text-sm text-zinc-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:bg-[#111827] transition-all outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="linked-issue-input"
              className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono"
            >
              Linked Issue URL (Optional)
            </label>
            <input
              id="linked-issue-input"
              type="text"
              placeholder="https://github.com/owner/repo/issues/123"
              value={linkedIssueURL}
              onChange={(e) => setLinkedIssueURL(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-[#1e293b]/50 font-mono text-sm text-zinc-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:bg-[#111827] transition-all outline-none"
            />
          </div>
        </div>

        <div className="mb-4">
          <label
            htmlFor="pr-title-input"
            className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono"
          >
            Pull Request Title
          </label>
          <input
            id="pr-title-input"
            type="text"
            required
            placeholder="e.g. fix(core): resolve null pointer exception in parser"
            value={prTitle}
            onChange={(e) => setPRTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-[#1e293b]/50 font-mono text-sm text-zinc-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:bg-[#111827] transition-all outline-none"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="pr-description-input"
            className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono"
          >
            Pull Request Description / Summary
          </label>
          <textarea
            id="pr-description-input"
            rows={3}
            placeholder="Explain what this PR solves, regression testing performed, and upstream bug context..."
            value={prDescription}
            onChange={(e) => setPRDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-[#1e293b]/50 font-sans text-sm text-zinc-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:bg-[#111827] transition-all outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="sm:col-span-2">
            <label
              htmlFor="changed-files-input"
              className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono"
            >
              Changed Files (One per line)
            </label>
            <textarea
              id="changed-files-input"
              rows={3}
              placeholder={"src/parser.ts\nsrc/parser.test.ts"}
              value={changedFilesText}
              onChange={(e) => setChangedFilesText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-[#1e293b]/50 font-mono text-xs text-zinc-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:bg-[#111827] transition-all outline-none"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
            <div>
              <label
                htmlFor="additions-input"
                className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1 font-mono"
              >
                + Additions
              </label>
              <input
                id="additions-input"
                type="number"
                placeholder="25"
                value={additions}
                onChange={(e) => setAdditions(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-1.5 text-sm rounded-xl border border-white/[0.12] bg-[#1e293b]/50 font-mono text-zinc-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:bg-[#111827] transition-all outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="deletions-input"
                className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1 font-mono"
              >
                - Deletions
              </label>
              <input
                id="deletions-input"
                type="number"
                placeholder="5"
                value={deletions}
                onChange={(e) => setDeletions(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-1.5 text-sm rounded-xl border border-white/[0.12] bg-[#1e293b]/50 font-mono text-zinc-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:bg-[#111827] transition-all outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-dark text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          {loading ? "Evaluating PR..." : "Run Pre-Flight Check"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {/* Results Section */}
      {result && (
        <div className="rounded-2xl bg-[#111827] p-5 sm:p-6 border-2 border-white/[0.08] shadow-sm mb-8 font-sans">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08] mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {result.ready_to_merge ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-950/80 border-emerald-800/80 px-2.5 py-0.5 rounded-full font-mono">
                    <CheckCircle2 className="h-3.5 w-3.5" /> PRE-FLIGHT READY
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-950/80 border-amber-800/80 px-2.5 py-0.5 rounded-full font-mono">
                    <AlertTriangle className="h-3.5 w-3.5" /> ADJUSTMENTS RECOMMENDED
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-zinc-200">{result.summary}</p>
            </div>
            <div className="flex items-center gap-4">
              {signedIn && (
                <ShareForecastButton
                  repoFullName={repoFullName || "Repository"}
                  overallScore={result.overall_score}
                  readyToMerge={result.ready_to_merge}
                  className="shrink-0"
                />
              )}
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-zinc-100">
                  {result.overall_score.toFixed(0)}
                  <span className="text-sm text-zinc-400">/100</span>
                </div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                  Pre-flight Score
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {result.checks.map((c) => (
              <div
                key={c.key}
                className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  c.passed
                    ? "bg-emerald-950/70 border-emerald-800/80/40 border-emerald-200"
                    : c.severity === "error"
                    ? "bg-rose-950/70 border-rose-800/80/40 border-rose-200"
                    : "bg-amber-950/70 border-amber-800/80/40 border-amber-200"
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
                    <h4 className="text-xs font-bold text-zinc-100 font-mono">{c.title}</h4>
                    <span className="text-[10px] font-mono uppercase text-zinc-400">
                      {c.passed ? "Pass" : c.severity}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{c.description}</p>
                  <p className="text-xs text-zinc-300 font-medium mt-1 bg-[#111827]/70 p-2 rounded-lg border border-white/[0.08]/60 font-mono">
                    💡 {c.suggestion}
                  </p>
                  {!c.passed && c.fixes && c.fixes.length > 0 ? (
                    <div className="mt-2">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                        One-click fixes
                      </p>
                      <div className="space-y-2">
                        {c.fixes.map((fix, i) => (
                          <div
                            key={`${fix.type}-${i}`}
                            className="rounded-lg border border-white/[0.08] bg-[#111827]/70 p-2"
                            data-testid={`fix-${fix.type}`}
                          >
                            <p className="text-[11px] font-semibold text-zinc-200 font-mono">
                              {fix.label}
                            </p>
                            <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-words mt-1 font-mono max-h-28 overflow-auto">
                              {fix.payload}
                            </pre>
                            <FixActions fix={fix} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Soft gate for the anonymous one-per-IP trial: aha first, auth after */}
          {!signedIn && (
            <div
              data-testid="anon-trial-gate"
              className="mt-5 rounded-xl bg-emerald-950/70 border-emerald-800/80/60 border border-emerald-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <p className="text-sm text-zinc-300 font-sans">
                <span className="font-semibold text-zinc-100">This is your free trial forecast.</span>{" "}
                Sign in to save, share, and track this forecast.
              </p>
              <a
                href={`${API_BASE_URL}/api/v1/auth/github`}
                data-testid="anon-trial-signin"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-dark text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Sign in with GitHub
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Anonymous trial exhausted on this IP/network (no result to show) */}
      {trialUsed && !result && !signedIn && !error && (
        <div
          role="status"
          className="rounded-2xl bg-emerald-950/70 border-emerald-800/80/60 border border-emerald-200 p-5 sm:p-6 mb-8 font-sans flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <p className="text-sm text-zinc-300">
            You&apos;ve used your free trial evaluation on this network. Sign in with GitHub to get 3
            free evaluations every month.
          </p>
          <a
            href={`${API_BASE_URL}/api/v1/auth/github`}
            className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-dark text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Sign in with GitHub
          </a>
        </div>
      )}
    </>
  );
}

export default function PreflightPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-zinc-100">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border-emerald-800/80 border border-emerald-200 text-emerald-300 text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Static Heuristic PR Pre-Flight Checklist</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-space text-zinc-100 tracking-tight">
            PR Acceptance Pre-Flight Evaluator
          </h1>
          <p className="text-sm text-zinc-400 font-sans mt-2 max-w-2xl">
            Test your pull request against repository conventions, test coverage heuristics, and
            size limits before opening it upstream.
          </p>
        </div>

        <Suspense fallback={<PreflightSkeleton />}>
          <PreflightContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
