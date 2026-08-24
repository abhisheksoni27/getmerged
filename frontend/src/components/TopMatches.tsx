"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface TopMatch {
  id: string;
  full_name: string;
  language: string | null;
  stars: number;
  description: string | null;
  github_url: string;
  match_score: number;
  reasons: string[];
}

// TopMatches renders the "Top matches for you" module driven by the user's
// GitHub-imported skills. Hidden entirely when there are no skills or matches.
export function TopMatches() {
  const [matches, setMatches] = useState<TopMatch[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/v1/user/top-matches`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setMatches(Array.isArray(data?.data) ? data.data : []);
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!matches || matches.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8" aria-label="Top matches for you">
      <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">Top matches for you</h2>
          <span className="ml-auto text-xs font-mono text-zinc-400">
            based on your GitHub languages
          </span>
        </div>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {matches.slice(0, 3).map((m) => (
            <li
              key={m.id}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/repo/${m.full_name}`}
                  className="text-sm font-semibold text-zinc-900 hover:text-orange-600"
                >
                  {m.full_name}
                </Link>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                  {Math.round(m.match_score)}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                {m.description || "No description available."}
              </p>
              {m.reasons.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {m.reasons.slice(0, 2).map((reason) => (
                    <li key={reason} className="flex items-start gap-1 text-[11px] text-zinc-600">
                      <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
