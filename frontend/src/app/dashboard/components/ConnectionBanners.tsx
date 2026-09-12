"use client";

import React from "react";
import { Clock, WifiOff } from "lucide-react";
import type { Connection } from "./types";

interface ConnectionBannersProps {
  connection: Connection | undefined;
  onReconnect: () => void;
}

export function ConnectionBanners({ connection, onReconnect }: ConnectionBannersProps) {
  if (connection?.status !== "reconnect_required" && !connection?.limited) return null;
  return (
    <>
      {/* AC6: reconnect banner */}
      {connection?.status === "reconnect_required" && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-950/70 border-amber-800/80 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-300">
            <WifiOff className="h-4 w-4 shrink-0" />
            GitHub connection expired - background syncing paused.
          </div>
          <button
            onClick={onReconnect}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer whitespace-nowrap"
          >
            Reconnect GitHub
          </button>
        </div>
      )}

      {/* AC5: limited badge when serving cached data due to rate limiting */}
      {connection?.limited && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          GitHub API rate limit hit - showing cached data. Live sync resumes automatically.
        </div>
      )}
    </>
  );
}
