"use client";

import React, { useState } from "react";
import { Sparkles, Copy, Check, Terminal, Code2 } from "lucide-react";

interface AIBadgePromptGeneratorProps {
  fullName: string;
}

export function AIBadgePromptGenerator({ fullName }: AIBadgePromptGeneratorProps) {
  const [badgeType, setBadgeType] = useState<"standard" | "karma" | "sweetspot">("standard");
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const standardBadge = `[![GetMerged C-Rank](https://getmerged.abhishekco.de/api/badge/${fullName})](https://getmerged.abhishekco.de/${fullName})`;
  const karmaBadge = `[![GetMerged Welcoming](https://getmerged.abhishekco.de/api/badge/${fullName}?style=for-the-badge)](https://getmerged.abhishekco.de/${fullName})`;

  const activeBadge = badgeType === "standard" ? standardBadge : karmaBadge;

  const aiPrompt = `Please add the GetMerged C-Rank PR velocity badge to our README.md in the header badges section:

${activeBadge}

This signals to external contributors that we actively review and merge pull requests.`;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(activeBadge);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(aiPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="rounded-3xl glass-panel border border-white/[0.1] p-6 sm:p-7 bg-zinc-950/60 shadow-xl space-y-5 text-white font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>GitHub README Badge</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-space text-white">
            Add GetMerged Badge to Your GitHub README
          </h3>
        </div>

        {/* Style Selector */}
        <div className="inline-flex rounded-xl bg-zinc-900 border border-white/[0.1] p-1 text-xs font-mono">
          <button
            onClick={() => setBadgeType("standard")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              badgeType === "standard" ? "bg-emerald-600 text-white font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Standard Badge
          </button>
          <button
            onClick={() => setBadgeType("karma")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              badgeType === "karma" ? "bg-emerald-600 text-white font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Bold Badge
          </button>
        </div>
      </div>

      {/* Markdown Snippet Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
          <span className="flex items-center gap-1.5">
            <Code2 className="h-3.5 w-3.5 text-emerald-400" /> Direct Markdown Code:
          </span>
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-xs font-mono text-zinc-200 transition-colors cursor-pointer"
          >
            {copiedMarkdown ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>
        </div>
        <div className="p-3 rounded-xl bg-black/60 border border-white/[0.08] text-xs font-mono text-emerald-300 select-all overflow-x-auto">
          {activeBadge}
        </div>
      </div>

      {/* AI Copilot / Cursor Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
          <span className="flex items-center gap-1.5 text-purple-300">
            <Terminal className="h-3.5 w-3.5" /> 1-Click Cursor / Copilot Prompt:
          </span>
          <button
            onClick={handleCopyPrompt}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-xs font-mono text-purple-200 transition-colors cursor-pointer"
          >
            {copiedPrompt ? (
              <>
                <Check className="h-3.5 w-3.5 text-purple-300" />
                <span className="text-purple-300">Copied Prompt!</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Copy AI Prompt</span>
              </>
            )}
          </button>
        </div>
        <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs font-mono text-zinc-300 leading-relaxed select-all">
          {aiPrompt}
        </div>
      </div>
    </div>
  );
}
