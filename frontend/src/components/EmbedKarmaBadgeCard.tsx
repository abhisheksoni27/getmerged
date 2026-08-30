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
      className="rounded-2xl glass-panel border bg-gradient-to-br from-emerald-950/20 via-zinc-950/80 to-zinc-900/50 p-6 sm:p-7 space-y-6 shadow-xl relative overflow-hidden"
      style={{ borderColor: `${badgeColor}40` }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>GitHub Profile README Badge · Viral Proof of Work</span>
          </div>
          <h3 className="text-lg font-bold font-space text-white">
            Embed Your Live Karma Badge on GitHub
          </h3>
          <p className="text-xs text-zinc-400 font-sans">
            Showcase your open-source contributor reputation directly on your GitHub profile and resume.
          </p>
        </div>

        <span className="glass-card px-3 py-1 rounded-xl text-xs font-mono text-emerald-400 shrink-0 self-start sm:self-auto flex items-center gap-1">
          <Flame className="h-3.5 w-3.5" /> Live Auto-Sync
        </span>
      </div>

      {/* Live Badge Preview Box */}
      <div className="p-5 rounded-xl bg-[#09090b] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Live Preview (Shields.io Style):
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
          className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 shrink-0"
        >
          <span>View Live Profile</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Snippet Format Selector & Copy Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1 p-1 bg-[#121214] rounded-xl border border-white/[0.08] font-mono text-xs">
            <button
              type="button"
              onClick={() => setEmbedType("markdown")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                embedType === "markdown"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Markdown (README.md)
            </button>
            <button
              type="button"
              onClick={() => setEmbedType("html")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                embedType === "html"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              HTML
            </button>
            <button
              type="button"
              onClick={() => setEmbedType("url")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                embedType === "url"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              SVG URL
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-[0.98]"
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
          <pre className="p-3.5 rounded-xl bg-[#0a0a0c] border border-white/[0.1] font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap selection:bg-emerald-500/30">
            <code>{currentSnippet}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
