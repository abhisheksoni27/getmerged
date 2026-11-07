"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Check, Copy, Trophy, Scale } from "lucide-react";
import { Repo } from "@/types/opendoor";
import { computeVsVerdict, formatMetricValue, VsVerdict } from "@/lib/vs-verdict";
import posthog from "posthog-js";

interface VsShowdownCardProps {
  repoA: Repo;
  repoB: Repo;
}

function buildShareUrl(repoA: Repo, repoB: Repo): string {
  return `https://getmerged.abhishekco.de/compare/${repoA.full_name}/vs/${repoB.full_name}`;
}

export function VsShowdownCard({ repoA, repoB }: VsShowdownCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const shareUrl = useMemo(() => buildShareUrl(repoA, repoB), [repoA, repoB]);
  const verdict: VsVerdict = useMemo(
    () => computeVsVerdict(repoA.full_name, repoB.full_name, repoA, repoB),
    [repoA, repoB]
  );

  const shareText = useMemo(() => {
    if (verdict.isTie) {
      return `${repoA.full_name} vs ${repoB.full_name}: it's Too Close to Call. See the numbers:`;
    }
    return `${verdict.winnerName} beats ${verdict.winner === "a" ? repoB.full_name : repoA.full_name} on maintainer responsiveness & merge velocity. Receipts:`;
  }, [verdict, repoA.full_name, repoB.full_name]);

  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        return true;
      } catch (err) {
        console.warn("navigator.clipboard failed, attempting fallback:", err);
      }
    }
    // Fallback for non-secure contexts or unsupported environments
    try {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textArea);
      return ok;
    } catch (err) {
      console.error("Clipboard copy fallback failed:", err);
      return false;
    }
  }, [shareUrl]);

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard();
    if (success) {
      setCopied(true);
      setCopyFailed(false);
      posthog.capture("vs_showdown_url_copied", {
        repo_a: repoA.full_name,
        repo_b: repoB.full_name,
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Final fallback: expose a selectable readonly input.
      setCopyFailed(true);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [copyToClipboard, repoA.full_name, repoB.full_name]);

  const openShare = useCallback(
    (network: "x" | "linkedin" | "reddit") => {
      let url: string;
      if (network === "x") {
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
      } else if (network === "linkedin") {
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
      } else {
        url = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`${repoA.full_name} vs ${repoB.full_name}: ${verdict.label}`)}`;
      }
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        console.warn(`Failed to open ${network} share window:`, err);
      }
      posthog.capture("vs_showdown_shared", {
        repo_a: repoA.full_name,
        repo_b: repoB.full_name,
        network,
      });
    },
    [shareText, shareUrl, verdict.label, repoA.full_name, repoB.full_name]
  );

  return (
    <section
      aria-label="Repo vs Repo showdown verdict"
      className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-sm mb-12"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C4910A]/10 border border-[#C4910A]/30 text-[#C4910A] text-xs font-mono font-bold">
          <Trophy className="h-3.5 w-3.5" /> Should I Contribute? Showdown Verdict
        </div>
        <span
          data-testid="vs-verdict-badge"
          className={
            verdict.isTie
              ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
              : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-[#0D9668]/10 text-[#0D9668] border border-[#0D9668]/30"
          }
        >
          <Scale className="h-3.5 w-3.5" />
          {verdict.label}
        </span>
      </div>

      {/* 3 headline metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {verdict.metrics.map((m) => {
          const decided =
            !verdict.isTie && m.valueA !== null && m.valueB !== null && m.valueA !== m.valueB;
          const aWins = decided && (m.higherWins ? m.valueA! > m.valueB! : m.valueA! < m.valueB!);
          return (
            <div
              key={m.key}
              className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-4 font-mono text-xs"
            >
              <p className="text-[var(--text-secondary)] font-sans font-semibold mb-2">{m.label}</p>
              <div className="flex items-center justify-between gap-2">
                <span className={decided && aWins ? "text-[#0D9668] font-bold" : "text-[var(--text-primary)] font-medium"}>
                  {formatMetricValue(m.valueA, m.format)}
                </span>
                <span className="text-[var(--text-tertiary)]">vs</span>
                <span
                  className={decided && !aWins ? "text-[#0D9668] font-bold" : "text-[var(--text-primary)] font-medium"}
                >
                  {formatMetricValue(m.valueB, m.format)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Share actions */}
      <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          data-testid="vs-copy-button"
          onClick={handleCopy}
          aria-live="polite"
          title="Copy comparison link"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-mono rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] hover:bg-[var(--color-neutral-800)] active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#0D9668]" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Share Link</span>
            </>
          )}
        </button>

        <button type="button" onClick={() => openShare("x")} title="Share verdict on X" className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-mono rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] active:scale-[0.98] transition-all cursor-pointer shadow-2xs">X</button>
        <button type="button" onClick={() => openShare("linkedin")} title="Share verdict on LinkedIn" className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-mono rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] active:scale-[0.98] transition-all cursor-pointer shadow-2xs">LinkedIn</button>
        <button type="button" onClick={() => openShare("reddit")} title="Share verdict on Reddit" className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-mono rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] active:scale-[0.98] transition-all cursor-pointer shadow-2xs">Reddit</button>
      </div>

      {copyFailed && (
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={shareUrl}
          onFocus={(e) => e.target.select()}
          aria-label="Comparison share link - select and copy manually"
          className="mt-3 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] focus:outline-none"
        />
      )}

      <p className="mt-4 text-xs text-[var(--text-tertiary)]">
        Verdict computed from external PR merge rate, median review latency, and 90-day bus factor; ties broken by recent commit (PR) velocity.{" "}
        <a href={`/api/og/vs?a=${encodeURIComponent(repoA.full_name)}&b=${encodeURIComponent(repoB.full_name)}`} className="text-[var(--color-primary)] hover:underline font-mono">
          View share card image
        </a>
      </p>
    </section>
  );
}

export default VsShowdownCard;
