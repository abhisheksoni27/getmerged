"use client";

import React from "react";
import { MergedPRItem } from "@/types/opendoor";
import { GitMerge, ExternalLink } from "lucide-react";

interface RecentMergedPRsTableProps {
  mergedPRs?: MergedPRItem[];
  fullName: string;
}

export function RecentMergedPRsTable({ mergedPRs = [], fullName }: RecentMergedPRsTableProps) {
  if (!mergedPRs || mergedPRs.length === 0) {
    return (
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span className="live-dot" />
            <span>Beat 3: Proof - Recent Outside Merged PRs</span>
          </div>
          <span className="pill pill-green">Verified Ingestion</span>
        </div>
        <div className="p-6 text-center text-xs font-mono text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-md">
          Continuous merge ingestion active. Outside pull request events are indexed automatically as maintainers merge incoming code.
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-6 overflow-hidden">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <span className="live-dot" />
          <span>Beat 3: Proof - Recent Outside Merged PRs</span>
        </div>
        <span className="pill pill-green">
          <GitMerge className="h-3 w-3 text-[var(--green-bright)]" />
          <span>{mergedPRs.length} Verified Merges</span>
        </span>
      </div>

      <div className="overflow-x-auto -mx-5 -mb-5 mt-2">
        <table className="bench-table border-0 rounded-none w-full">
          <thead>
            <tr>
              <th>Pull Request</th>
              <th>Contributor</th>
              <th>Turnaround</th>
              <th>Merged At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {mergedPRs.map((pr) => {
              const dateStr = pr.merged_at
                ? new Date(pr.merged_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "Recent";
              return (
                <tr key={pr.pr_number}>
                  <td>
                    <a
                      href={pr.html_url || `https://github.com/${fullName}/pull/${pr.pr_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--purple-bright)] hover:underline"
                    >
                      <span>#{pr.pr_number}</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  </td>
                  <td>
                    <span className="pill">@{pr.author_login}</span>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-[var(--text-secondary)]">{pr.turnaround_str}</span>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-[var(--text-tertiary)]">{dateStr}</span>
                  </td>
                  <td>
                    <span className="pill pill-green">Merged</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
