import React from "react";
import { Check, Copy } from "lucide-react";
import posthog from "posthog-js";

interface RepoBadgeGeneratorProps {
  fullName: string;
  badgeShowPoints: boolean;
  setBadgeShowPoints: (val: boolean) => void;
  badgeColor: string;
  setBadgeColor: (val: string) => void;
  badgePreviewUrl: string;
  badgeMarkdownUrl: string;
  badgeCopied: boolean;
  setBadgeCopied: (val: boolean) => void;
}

export function RepoBadgeGenerator({
  fullName,
  badgeShowPoints,
  setBadgeShowPoints,
  badgeColor,
  setBadgeColor,
  badgePreviewUrl,
  badgeMarkdownUrl,
  badgeCopied,
  setBadgeCopied,
}: RepoBadgeGeneratorProps) {
  return (
    <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs mb-8">
      <div className="mb-4">
        <h3 className="font-space text-lg font-bold text-zinc-900">
          Embed C-Rank Badge on GitHub README
        </h3>
        <p className="text-xs sm:text-sm text-zinc-600 font-sans mt-0.5">
          Show contributors that your repository actively reviews and merges external pull requests.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-600 mb-5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={badgeShowPoints}
            onChange={(e) => setBadgeShowPoints(e.target.checked)}
            className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
          />
          <span>Show Raw C-Rank Score Points</span>
        </label>

        <label className="flex items-center gap-2">
          <span>Badge Color:</span>
          <select
            value={badgeColor}
            onChange={(e) => setBadgeColor(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-mono text-zinc-800"
          >
            <option value="auto">Auto (Match C-Rank Tier)</option>
            <option value="emerald">Emerald</option>
            <option value="blue">Blue</option>
            <option value="amber">Amber</option>
            <option value="purple">Purple</option>
            <option value="rose">Rose</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl shadow-2xs">
        <div className="flex items-center min-h-10 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={badgePreviewUrl}
            alt={`Opendoor C-Rank badge for ${fullName}`}
            width={280}
            height={28}
            className="h-7 w-auto"
          />
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`[![Opendoor C-Rank](${badgeMarkdownUrl})](https://opendoor.abhishekco.de/${fullName})`);
            posthog.capture("badge_copied", { repo_full_name: fullName });
            setBadgeCopied(true);
            setTimeout(() => setBadgeCopied(false), 2000);
          }}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white font-semibold text-xs shrink-0 transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-2"
        >
          {badgeCopied ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
              <Check className="h-3.5 w-3.5" /> Copied Markdown!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy Markdown
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
