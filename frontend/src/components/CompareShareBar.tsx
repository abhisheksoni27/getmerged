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
      className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/80 border border-white/[0.08] shadow-xs mb-8"
    >
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
        <span className="font-semibold text-zinc-100 font-sans text-sm">
          Export & Share
        </span>
        <span className="hidden sm:inline text-zinc-400">•</span>
        <span className="hidden sm:inline text-zinc-400">
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
              ? "inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-mono rounded-xl bg-emerald-950/70 border-emerald-800/80 text-emerald-300 border border-emerald-300 transition-all duration-150 cursor-pointer shadow-2xs"
              : "inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-mono rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 cursor-pointer shadow-xs"
          }
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>Copied Markdown!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
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
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-mono rounded-xl bg-zinc-900 text-zinc-200 hover:bg-zinc-200 border border-white/[0.08]/60 active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 cursor-pointer shadow-2xs"
        >
          <Share2 className="h-3.5 w-3.5 text-zinc-400" />
          <span>Share Comparison</span>
          <ExternalLink className="h-3 w-3 text-zinc-400" />
        </button>
      </div>
    </div>
  );
}
