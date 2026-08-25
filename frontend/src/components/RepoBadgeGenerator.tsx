"use client";

import React, { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import posthog from "posthog-js";

const SITE_URL = "https://getmerged.abhishekco.de";

interface RepoBadgeGeneratorProps {
  fullName: string;
}

export function RepoBadgeGenerator({ fullName }: RepoBadgeGeneratorProps) {
  const [activeTab, setActiveTab] = useState<"markdown" | "html">("markdown");
  const [copied, setCopied] = useState(false);
  const [badgeAvailable, setBadgeAvailable] = useState(true);

  const parts = fullName.split("/");
  const owner = parts[0];
  const name = parts[1];

  const badgeSvgUrl = `${SITE_URL}/api/v1/badges/${owner}/${name}/badge.svg`;
  const repoLinkUrl = `${SITE_URL}/${fullName}?utm_source=github&utm_medium=badge`;

  const markdownSnippet = `[![GetMerged C-Rank](${badgeSvgUrl})](${repoLinkUrl})`;
  const htmlSnippet = `<a href="${repoLinkUrl}"><img src="${badgeSvgUrl}" alt="GetMerged C-Rank badge for ${fullName}" /></a>`;

  const snippet = activeTab === "markdown" ? markdownSnippet : htmlSnippet;

  // Hide the whole block when the badge endpoint is unavailable (404/network error)
  useEffect(() => {
    if (!owner || !name) return;
    let cancelled = false;
    fetch(`${SITE_URL}/api/v1/badges/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/badge.json`)
      .then((res) => {
        if (!cancelled) setBadgeAvailable(res.ok);
      })
      .catch(() => {
        if (!cancelled) setBadgeAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [owner, name]);

  if (!owner || !name || !badgeAvailable) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      posthog.capture("badge_embed_copied", { repo_full_name: fullName, format: activeTab });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs mb-8">
      <div className="mb-4">
        <h3 className="font-space text-lg font-bold text-zinc-900">
          Embed C-Rank Badge
        </h3>
        <p className="text-xs sm:text-sm text-zinc-600 font-sans mt-0.5">
          Show contributors that your repository actively reviews and merges external pull requests.
        </p>
      </div>

      {/* Live badge preview */}
      <div className="flex items-center min-h-10 p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl shadow-2xs mb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badgeSvgUrl}
          alt={`GetMerged C-Rank badge for ${fullName}`}
          width={280}
          height={28}
          className="h-7 w-auto"
        />
      </div>

      {/* Snippet format tabs */}
      <div className="flex items-center gap-2 mb-3">
        {(["markdown", "html"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setCopied(false);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {tab === "markdown" ? "Markdown" : "HTML"}
          </button>
        ))}
      </div>

      {/* Snippet + copy action */}
      <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl shadow-2xs">
        <pre className="text-xs font-mono text-zinc-700 whitespace-pre-wrap break-all mb-4 select-all">{snippet}</pre>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopy}
            title={`Copy ${activeTab === "markdown" ? "markdown" : "HTML"} badge embed code`}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white font-semibold text-xs shrink-0 transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-2"
          >
            {copied ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                <Check className="h-3.5 w-3.5" /> Copied!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Copy {activeTab === "markdown" ? "Markdown" : "HTML"}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              const prompt = `Add the GetMerged C-Rank™ maintainer badge to the top of our repository README.md (right below the main title/hero section):

\`\`\`markdown
${markdownSnippet}
\`\`\`

Why:
- Shows contributors that our repo actively reviews and merges external pull requests.
- Displays our live C-Rank scorecard and response time metrics directly from ${SITE_URL}/${fullName}.`;
              navigator.clipboard.writeText(prompt);
              posthog.capture("badge_prompt_copied", { repo_full_name: fullName });
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            title="Copy AI prompt to add GetMerged badge to your repo README via Cursor, Copilot, or Claude"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 active:scale-95 text-zinc-900 border border-zinc-200 font-semibold text-xs shrink-0 transition-all cursor-pointer shadow-2xs inline-flex items-center justify-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy AI Prompt (for LLMs)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
