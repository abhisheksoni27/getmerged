"use client";

import React, { useState } from "react";
import { Copy, Check, Sparkles, ExternalLink, Flame } from "lucide-react";

interface EmbedKarmaBadgeCardProps {
  username: string;
  karma?: number;
  levelTitle?: string;
  badgeColor?: string;
}

export function EmbedKarmaBadgeCard({
  username,
  karma = 1250,
  levelTitle = "Active Contributor",
  badgeColor = "#10b981",
}: EmbedKarmaBadgeCardProps) {
  const [embedType, setEmbedType] = useState<"markdown" | "html" | "url">("markdown");
  const [copied, setCopied] = useState(false);

  const cleanUsername = username.replace(/^@/, "");
  const badgeUrl = `https://getmerged.abhishekco.de/api/badge/u/${cleanUsername}`;
  const profileUrl = `https://getmerged.abhishekco.de/u/${cleanUsername}`;

  const markdownSnippet = `[![GetMerged Karma](${badgeUrl})](${profileUrl})`;
  const htmlSnippet = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer"><img src="${badgeUrl}" alt="GetMerged Contributor Karma" /></a>`;
  const urlSnippet = badgeUrl;

  const currentSnippet =
    embedType === "markdown" ? markdownSnippet : embedType === "html" ? htmlSnippet : urlSnippet;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 space-y-6 shadow-sm relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#0D9668] text-xs font-mono font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>GitHub Profile README Badge · Viral Proof of Work</span>
          </div>
          <h3 className="text-lg font-bold font-space text-[var(--text-primary)]">
            Embed Your Live Karma Badge on GitHub
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans">
            Showcase your open-source contributor reputation directly on your GitHub profile and resume.
          </p>
        </div>

        <span className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-1 rounded-xl text-xs font-mono text-[#0D9668] shrink-0 self-start sm:self-auto flex items-center gap-1">
          <Flame className="h-3.5 w-3.5" /> Live Auto-Sync
        </span>
      </div>

      {/* Live Badge Preview Box */}
      <div className="p-5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="text-xs font-mono text-[#0D9668] uppercase tracking-wider font-semibold">
            Live Badge Preview:
          </div>
          <div className="pt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/badge/u/${cleanUsername}`}
              alt={`GetMerged Karma: ${karma} · ${levelTitle}`}
              className="inline-block hover:opacity-95 transition-opacity"
            />
          </div>
        </div>

        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-[#0D9668] hover:underline flex items-center gap-1.5 shrink-0"
        >
          <span>View Live Profile</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Snippet Format Selector & Copy Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] font-mono text-xs">
            <button
              type="button"
              onClick={() => setEmbedType("markdown")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                embedType === "markdown"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs border border-[var(--border-subtle)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Markdown (README.md)
            </button>
            <button
              type="button"
              onClick={() => setEmbedType("html")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                embedType === "html"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs border border-[var(--border-subtle)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              HTML
            </button>
            <button
              type="button"
              onClick={() => setEmbedType("url")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                embedType === "url"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs border border-[var(--border-subtle)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              SVG URL
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-1.5 rounded-xl bg-[#0D9668] hover:bg-[#0D9668]/90 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code Snippet Box */}
        <div className="relative">
          <pre className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-primary)] overflow-x-auto whitespace-pre-wrap">
            <code>{currentSnippet}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
