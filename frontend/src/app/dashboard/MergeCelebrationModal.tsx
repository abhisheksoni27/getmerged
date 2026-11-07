"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PartyPopper, X, ExternalLink, Copy, Check } from "lucide-react";
import { formatVerdict, type PREvalOutcome } from "@/lib/pr-verdict";
import { getReferralCode } from "@/lib/referral";
import { buildTwitterIntent, buildLinkedInIntent } from "@/lib/pr-forecast-share";

// Minimal shape of a tracked PR row needed for merge-moment detection;
// structurally compatible with TrackedPR from DashboardClient.
export interface CelebratablePR {
  pr_id: string;
  full_name: string;
  pr_number: number;
  state: string;
  outcome?: PREvalOutcome | null;
}

// One-time celebration ledger: localStorage-backed with an in-memory session
// fallback so private-mode/storage failures never crash or re-spam the modal
// within a session.
const celebratedInMemory = new Set<string>();

function storageKey(prId: string): string {
  return `gm_merge_celebrated:${prId}`;
}

function wasCelebrated(prId: string): boolean {
  if (celebratedInMemory.has(prId)) return true;
  try {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(storageKey(prId)) === "1";
  } catch {
    return false;
  }
}

function markCelebrated(prId: string): void {
  celebratedInMemory.add(prId);
  try {
    window.localStorage.setItem(storageKey(prId), "1");
  } catch {
    // storage unavailable: session-only suppression is the safe fallback
  }
}

async function copyWithFallback(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to execCommand fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function MergeCelebrationModal({ prs }: { prs: CelebratablePR[] }) {
  const [celebrating, setCelebrating] = useState<CelebratablePR | null>(null);
  const [copied, setCopied] = useState(false);
  const [cardFailed, setCardFailed] = useState(false);

  // First tracked PR that flipped to merged with a stored preflight evaluation
  // and has not been celebrated yet (one-time per PR).
  useEffect(() => {
    if (celebrating) return;
    const next = prs.find(
      (p) =>
        p.state === "merged" &&
        !!p.outcome?.merged_at &&
        (p.outcome.state === "hit" || p.outcome.state === "miss") &&
        !!p.outcome.eval_id &&
        !wasCelebrated(p.pr_id)
    );
    if (next) setCelebrating(next);
  }, [prs, celebrating]);

  const dismiss = useCallback(() => {
    if (celebrating) markCelebrated(celebrating.pr_id);
    setCelebrating(null);
  }, [celebrating]);

  const links = useMemo(() => {
    if (!celebrating?.outcome) return null;
    try {
      const oc = celebrating.outcome;
      const evalId = oc.eval_id as string;
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || "https://getmerged.abhishekco.de";
      const repo = celebrating.full_name;
      const pct = Math.round(oc.predicted_score ?? 0);
      const staticVerdict = pct >= 50 ? "PRE-FLIGHT READY" : "ADJUSTMENTS RECOMMENDED";
      const refCode = getReferralCode() || undefined;

      const destinationUrl = `${origin}/share/pr-eval/${encodeURIComponent(evalId)}?repo=${encodeURIComponent(
        repo
      )}&score=${pct}&verdict=${encodeURIComponent(staticVerdict)}&pr_number=${
        celebrating.pr_number
      }${refCode ? `&ref=${encodeURIComponent(refCode)}` : ""}`;

      const ogCardUrl = `${origin}/api/og/pr-eval/${encodeURIComponent(
        evalId
      )}?repo=${encodeURIComponent(repo)}&score=${pct}&verdict=${encodeURIComponent(
        staticVerdict
      )}&v=${encodeURIComponent(oc.outcome_hash || "0")}`;

      const verdictView = formatVerdict(oc);
      const days = Math.max(0, Math.round(oc.days_to_merge ?? 0));
      const headline = `Predicted ${pct}% → MERGED in ${days} ${days === 1 ? "day" : "days"}`;
      const shareText = `Prediction verified: ${headline} for ${repo}#${
        celebrating.pr_number
      } - my @GetMerged pre-flight forecast was right${oc.state === "hit" ? "" : " (well, almost)"}. See my verified track record:`;

      return {
        destinationUrl,
        ogCardUrl,
        xIntent: buildTwitterIntent(shareText, destinationUrl),
        linkedInIntent: buildLinkedInIntent(destinationUrl),
        headline,
        verdictView,
      };
    } catch {
      return null;
    }
  }, [celebrating]);

  useEffect(() => {
    setCardFailed(false);
    setCopied(false);
  }, [links?.ogCardUrl]);

  if (!celebrating || !links) return null;

  const shareAndClose = () => dismiss();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-surface)] backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Prediction verified celebration"
      onClick={dismiss}
      data-testid="merge-celebration-modal"
    >
      <div
        className="w-full max-w-lg rounded-2xl glass-panel border-2 border-violet-400 shadow-sm overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 bg-violet-600 text-[var(--text-primary)]">
          <div className="flex items-center gap-2 font-bold text-sm font-mono uppercase tracking-wider">
            <PartyPopper className="h-4 w-4" /> Prediction Verified
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss celebration"
            className="text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-lg font-bold text-[var(--text-primary)] mb-1">
            {links.headline} 🎉
          </p>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            {celebrating.full_name}#{celebrating.pr_number} merged. Your pre-flight call is now a
            publicly verifiable fact - brag about it.
          </p>

          {/* Auto-generated share card via the existing OG endpoint */}
          {!cardFailed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={links.ogCardUrl}
              alt={`Share card: ${links.headline} for ${celebrating.full_name}`}
              onError={() => setCardFailed(true)}
              className="w-full rounded-xl border border-[var(--border-subtle)] mb-4"
              data-testid="merge-celebration-card"
            />
          )}
          {cardFailed && links.verdictView && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-950/70 border-emerald-800/80 px-3 py-2 text-sm font-mono font-bold text-emerald-300 mb-4">
              {links.verdictView.text}
            </div>
          )}

          {/* One-click posting via existing intent builders (+referral link) */}
          <div className="space-y-2 mb-4">
            <a
              href={links.xIntent}
              target="_blank"
              rel="noopener noreferrer"
              onClick={shareAndClose}
              data-testid="merge-celebration-x"
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl glass-card hover:bg-black text-white text-xs font-mono font-bold transition-all"
            >
              <span>Post to X</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href={links.linkedInIntent}
              target="_blank"
              rel="noopener noreferrer"
              onClick={shareAndClose}
              data-testid="merge-celebration-linkedin"
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-[#0077b5] hover:bg-[#006396] text-white text-xs font-mono font-bold transition-all"
            >
              <span>Post to LinkedIn</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)]">
            <label className="block text-[11px] font-mono font-bold text-[var(--text-secondary)] uppercase mb-1">
              Share link (with your referral credit)
            </label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={links.destinationUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 rounded-xl border border-[var(--border-subtle)] glass-card px-3 py-2 text-xs font-mono text-[var(--text-secondary)]"
              />
              <button
                type="button"
                data-testid="merge-celebration-copy"
                onClick={async () => {
                  const ok = await copyWithFallback(links.destinationUrl);
                  if (ok) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="px-3 py-2 rounded-xl glass-card border border-[var(--border-subtle)] hover:bg-zinc-200 text-xs font-mono font-bold text-[var(--text-primary)] flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
