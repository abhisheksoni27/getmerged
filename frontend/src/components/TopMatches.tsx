"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Star, ArrowUpRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { LangLogo } from "@/components/LangLogo";
import posthog from "posthog-js";

interface TopMatch {
  id: string;
  full_name: string;
  language: string | null;
  stars: number;
  description: string | null;
  github_url: string;
  match_score: number;
  c_rank_tier?: string;
  class_rank?: string;
  reasons: string[];
}

export function TopMatches() {
  const [matches, setMatches] = useState<TopMatch[] | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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
    <section className="w-full max-w-4xl mx-auto text-left" aria-label="Top matches for you">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 shadow-sm">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] font-display">
                Top matches for you
              </h2>
            </div>
          </div>
          <span className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-1 rounded-full self-start sm:self-auto">
            tailored to your GitHub languages
          </span>
        </div>

        {/* 3-Column Match Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {matches.slice(0, 3).map((m) => {
            const fullName = m.full_name || "";
            const [ownerPart, namePart] = fullName.includes("/")
              ? fullName.split("/")
              : ["", fullName];
            const owner = ownerPart || fullName;
            const repoName = namePart || fullName;
            const scoreVal = Math.round(m.match_score);
            const hasImgError = imageErrors[fullName];
            const tier = m.c_rank_tier || m.class_rank || "A";

            return (
              <Link prefetch={false}
                key={m.id || fullName}
                href={`/${fullName}`}
                onClick={() => {
                  posthog.capture("top_match_card_clicked", {
                    repo_full_name: fullName,
                    match_score: scoreVal,
                  });
                }}
                className="group relative flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-hover)] p-5 transition-all duration-200 shadow-xs hover:shadow-md text-left"
              >
                <div>
                  {/* Top Row: Avatar + Repo Name + Match Score Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative h-9 w-9 rounded-xl overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-subtle)] shrink-0 flex items-center justify-center">
                        {!hasImgError ? (
                          <Image
                            src={`https://github.com/${owner}.png?size=64`}
                            alt={owner}
                            width={36}
                            height={36}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setImageErrors((prev) => ({ ...prev, [fullName]: true }));
                            }}
                            unoptimized
                          />
                        ) : m.language ? (
                          <LangLogo language={m.language} className="h-4 w-4" />
                        ) : (
                          <span className="font-mono text-xs font-bold text-[var(--text-tertiary)]">
                            {owner.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-mono text-[var(--text-tertiary)] truncate block leading-tight">
                          {owner}
                        </span>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors truncate block leading-tight mt-0.5 font-sans">
                          {repoName}
                        </h3>
                      </div>
                    </div>

                    {/* Match Score Badge (Fixed width / flex-shrink 0 to never overflow) */}
                    <div className="shrink-0 flex items-center gap-1 rounded-full bg-[#C4910A]/10 border border-[#C4910A]/30 px-2 py-0.5 text-xs font-mono font-bold text-[#C4910A] shadow-xs">
                      <Sparkles className="h-2.5 w-2.5 text-[#C4910A]" />
                      <span>{scoreVal}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)] font-sans">
                    {m.description || "Active open-source project welcoming contributors."}
                  </p>

                  {/* Reasons / Highlights */}
                  {m.reasons && m.reasons.length > 0 && (
                    <ul className="mt-3.5 space-y-1.5 pt-2.5 border-t border-[var(--border-subtle)]">
                      {m.reasons.slice(0, 2).map((reason) => (
                        <li
                          key={reason}
                          className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)] font-sans leading-tight"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0D9668]" />
                          <span className="line-clamp-1">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Footer Bar: Meta Tags & Link */}
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-tertiary)] font-mono">
                  <div className="flex items-center gap-2">
                    {tier && (
                      <span className="rounded-lg bg-[#0D9668]/10 border border-[#0D9668]/30 px-2 py-0.5 text-[11px] font-bold text-[#0D9668]">
                        {tier}-Tier
                      </span>
                    )}
                    {m.language && (
                      <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                        <LangLogo language={m.language} className="h-3 w-3" />
                        <span className="text-[11px]">{m.language}</span>
                      </span>
                    )}
                    {m.stars > 0 && (
                      <span className="flex items-center gap-0.5 text-[#C4910A] text-[11px]">
                        <Star className="h-3 w-3 fill-[#C4910A]" />
                        {m.stars >= 1000 ? `${(m.stars / 1000).toFixed(0)}k` : m.stars}
                      </span>
                    )}
                  </div>

                  <span className="flex items-center gap-0.5 text-xs text-[var(--color-primary)] font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>View</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
