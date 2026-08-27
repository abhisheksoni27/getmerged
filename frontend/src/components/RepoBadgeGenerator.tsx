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

  const badgeSvgUrl = `${SITE_URL}/api/badge/${owner}/${name}`;
  const repoLinkUrl = `${SITE_URL}/${fullName}?utm_source=github&utm_medium=badge`;

  const markdownSnippet = `[![GetMerged C-Rank](${badgeSvgUrl})](${repoLinkUrl})`;
  const htmlSnippet = `<a href="${repoLinkUrl}"><img src="${badgeSvgUrl}" alt="GetMerged C-Rank badge for ${fullName}" /></a>`;

  const snippet = activeTab === "markdown" ? markdownSnippet : htmlSnippet;

  // Hide the whole block when the badge endpoint is unavailable (404/network error)
  useEffect(() => {
    if (!owner || !name) return;
    let cancelled = false;
    fetch(`${SITE_URL}/api/badge/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`)
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

  const onCopied = (eventName: string, props?: Record<string, string>) => {
    try {
      posthog.capture(eventName, props);
    } catch {
      // analytics must never break copying
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const legacyCopy = (text: string) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      // best-effort fallback; nothing else to do
    }
  };

  const copyText = (text: string, eventName: string, props?: Record<string, string>) => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => onCopied(eventName, props))
          .catch(() => {
            legacyCopy(text);
            onCopied(eventName, props);
          });
      } else {
        legacyCopy(text);
        onCopied(eventName, props);
      }
    } catch {
      legacyCopy(text);
      onCopied(eventName, props);
    }
  };

  const handleCopy = () => {
    copyText(snippet, "badge_embed_copied", { repo_full_name: fullName, format: activeTab });
  };

  return (
    <div className="rounded-3xl border border-white/[0.1] glass-panel p-6 sm:p-8 shadow-xs mb-8">
      <div className="mb-4">
        <h3 className="font-space text-lg font-bold text-white">
          Embed C-Rank Badge
        </h3>
        <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-0.5">
          Show contributors that your repository actively reviews and merges external pull requests.
        </p>
      </div>

      {/* Live badge preview */}
      <div className="flex items-center min-h-10 p-4 glass-card border border-white/[0.1] rounded-2xl shadow-2xs mb-5">
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
                ? "glass-card text-white shadow-xs"
                : "glass-card text-zinc-300 hover:bg-zinc-200"
            }`}
          >
            {tab === "markdown" ? "Markdown" : "HTML"}
          </button>
        ))}
      </div>

      {/* Snippet + copy action */}
      <div className="p-4 glass-card border border-white/[0.1] rounded-2xl shadow-2xs">
        <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all mb-4 select-all">{snippet}</pre>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopy}
            title={`Copy ${activeTab === "markdown" ? "markdown" : "HTML"} badge embed code`}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl glass-card hover:bg-zinc-800 active:scale-95 text-white font-semibold text-xs shrink-0 transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-2"
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
              copyText(prompt, "badge_prompt_copied", { repo_full_name: fullName });
            }}
            title="Copy AI prompt to add GetMerged badge to your repo README via Cursor, Copilot, or Claude"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl glass-panel hover:glass-card active:scale-95 text-white border border-white/[0.1] font-semibold text-xs shrink-0 transition-all cursor-pointer shadow-2xs inline-flex items-center justify-center gap-2"
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
