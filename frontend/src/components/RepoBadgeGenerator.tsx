"use client";

import React, { useEffect, useState } from "react";
import { Check, Shield, Copy } from "lucide-react";
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

  const handleCopy = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(snippet);
      setCopied(true);
      posthog.capture("badge_embed_copied", { repo_full_name: fullName, format: activeTab });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="card card-highlight mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-[var(--purple-bright)]" />
          <span>Embed Live C-Rank™ Badge</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("markdown")}
            className={`px-2.5 py-1 text-[11px] font-mono rounded cursor-pointer transition-colors ${
              activeTab === "markdown"
                ? "bg-[rgba(163,113,247,0.2)] text-[var(--purple-bright)] font-semibold border border-[var(--border-accent)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Markdown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("html")}
            className={`px-2.5 py-1 text-[11px] font-mono rounded cursor-pointer transition-colors ${
              activeTab === "html"
                ? "bg-[rgba(163,113,247,0.2)] text-[var(--purple-bright)] font-semibold border border-[var(--border-accent)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            HTML
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--text-tertiary)] mb-3">
        Showcase your verified welcoming reputation directly on your GitHub repository README:
      </p>

      {/* Live Badge Preview */}
      <div className="mb-3 p-3 bg-[#0D111A] border border-[var(--border-subtle)] rounded-md inline-flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badgeSvgUrl}
          alt={`GetMerged C-Rank badge for ${fullName}`}
          className="h-6"
          loading="lazy"
        />
        <span className="text-[11px] font-mono text-[var(--text-tertiary)]">Live SVG (auto-updates on rescore)</span>
      </div>

      {/* Code Terminal */}
      <div className="code-terminal">
        <code className="truncate mr-3 select-all">{snippet}</code>
        <button type="button" onClick={handleCopy} className="copy-btn shrink-0 flex items-center gap-1">
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[var(--green-bright)]" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
