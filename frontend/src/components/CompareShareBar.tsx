"use client";

import React, { useState, useCallback } from "react";
import { Check, Copy, Share2, ExternalLink } from "lucide-react";
import posthog from "posthog-js";
import { Repo } from "@/types/opendoor";
import {
  generateCompareMarkdown,
  generateCompareShareText,
  generateCompareShareUrl,
} from "@/lib/compare-export";

interface CompareShareBarProps {
  repoA: Repo;
  repoB: Repo;
}

export function CompareShareBar({ repoA, repoB }: CompareShareBarProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn("navigator.clipboard failed, attempting fallback:", err);
      }
    }

    // Fallback for non-secure contexts or unsupported environments
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

  const handleCopyMarkdown = useCallback(async () => {
    const md = generateCompareMarkdown(repoA, repoB);
    const success = await copyToClipboard(md);
    if (success) {
      setCopied(true);
      posthog.capture("compare_markdown_copied", {
        repo_a: repoA.full_name,
        repo_b: repoB.full_name,
      });
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  }, [repoA, repoB, copyToClipboard]);

  const handleShare = useCallback(async () => {
    const shareUrl = `https://getmerged.abhishekco.de/compare/${repoA.full_name}/vs/${repoB.full_name}`;
    const shareText = generateCompareShareText(repoA, repoB);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${repoA.full_name} vs ${repoB.full_name} Comparison | GetMerged`,
          text: shareText,
          url: shareUrl,
        });
        posthog.capture("compare_shared", {
          repo_a: repoA.full_name,
          repo_b: repoB.full_name,
          method: "web_share_api",
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          return;
        }
        console.warn("navigator.share error, falling back to intent url:", err);
      }
    }

    const intentUrl = generateCompareShareUrl(repoA, repoB);
    window.open(intentUrl, "_blank", "noopener,noreferrer");
    posthog.capture("compare_shared", {
      repo_a: repoA.full_name,
      repo_b: repoB.full_name,
      method: "twitter_intent",
    });
  }, [repoA, repoB]);

  return (
    <div
      role="region"
      aria-label="Repository comparison sharing and export tools"
      className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm mb-8"
    >
      <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)] font-sans text-sm">
          Export & Share
        </span>
        <span className="hidden sm:inline text-[var(--text-muted)]">•</span>
        <span className="hidden sm:inline text-[var(--text-muted)]">
          Share head-to-head metrics on GitHub or social media
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleCopyMarkdown}
          title="Copy formatted GitHub Markdown comparison table"
          aria-live="polite"
          className={
            copied
              ? "inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-mono rounded-xl bg-emerald-50 border border-emerald-300 text-[#0D9668] transition-all duration-150 cursor-pointer shadow-xs"
              : "inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-mono rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-xs"
          }
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#0D9668]" />
              <span>Copied Markdown!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
              <span>Copy Markdown Summary</span>
            </>
          )}
        </button>

        <button
          type="button"
          data-testid="compare-share-button"
          onClick={handleShare}
          title="Share repository comparison on X or external platforms"
          aria-label="Share comparison on social media or external platforms"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-mono rounded-xl bg-[var(--brand-terracotta)] text-white hover:bg-[var(--brand-terracotta)]/90 active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-xs"
        >
          <Share2 className="h-3.5 w-3.5 text-white" />
          <span>Share Comparison</span>
          <ExternalLink className="h-3 w-3 text-white/80" />
        </button>
      </div>
    </div>
  );
}
