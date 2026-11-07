import React from "react";
import { ExternalLink } from "lucide-react";
import { TrackedStatusItem } from "@/hooks/useFirstMergeTrack";

interface FirstMergeTrackCardProps {
  item: TrackedStatusItem;
  onCopyShareLink: (url: string) => void;
}

export function FirstMergeTrackCard({ item, onCopyShareLink }: FirstMergeTrackCardProps) {
  return (
    <li
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] glass-panel p-3"
    >
      <div className="min-w-0">
        <a
          href={item.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate block text-xs font-semibold text-white hover:text-emerald-400"
        >
          {item.owner}/{item.repo}#{item.pr_number}
        </a>
        <span className="mt-0.5 inline-block rounded-full glass-card px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--text-secondary)]">
          {item.state}
        </span>
      </div>
      {item.state === "merged" && item.has_artifact ? (
        <div className="flex items-center gap-2">
          <a
            href={item.share_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800"
          >
            <ExternalLink className="h-3 w-3" /> Merged via OpenDoor card
          </a>
          <button
            onClick={() => onCopyShareLink(`${window.location.origin}${item.share_url}`)}
            className="rounded-md border border-violet-300 glass-panel px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-50"
          >
            Copy link
          </button>
        </div>
      ) : (
        <span className="rounded-full bg-emerald-950/80 border-emerald-800/80 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
          Awaiting Merge
        </span>
      )}
    </li>
  );
}
