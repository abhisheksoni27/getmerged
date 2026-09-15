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
      <div className="rounded-2xl border border-amber-500/30 bg-[#121214]/80 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
                Top matches for you
              </h2>
            </div>
          </div>
          <span className="text-[11px] font-mono text-[#a3a3a3] bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-full self-start sm:self-auto">
            tailored to your GitHub languages
          </span>
        </div>

        {/* 3-Column Match Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
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
                className="group relative flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#17171a]/90 hover:bg-[#1c1c20] hover:border-emerald-500/40 p-4 transition-all duration-200 shadow-sm hover:shadow-lg text-left"
              >
                <div>
                  {/* Top Row: Avatar + Repo Name + Match Score Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative h-8 w-8 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                        {!hasImgError ? (
                          <Image
                            src={`https://github.com/${owner}.png?size=64`}
                            alt={owner}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setImageErrors((prev) => ({ ...prev, [fullName]: true }));
                            }}
                            unoptimized
                          />
                        ) : m.language ? (
                          <LangLogo language={m.language} className="h-4 w-4" />
                        ) : (
                          <span className="font-mono text-[10px] font-bold text-zinc-400">
                            {owner.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-mono text-[#a3a3a3] truncate block leading-tight">
                          {owner}
                        </span>
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate block leading-tight mt-0.5 font-sans">
                          {repoName}
                        </h3>
                      </div>
                    </div>

                    {/* Match Score Badge (Fixed width / flex-shrink 0 to never overflow) */}
                    <div className="shrink-0 flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-mono font-bold text-amber-400 shadow-sm">
                      <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                      <span>{scoreVal}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-[#a3a3a3] font-sans">
                    {m.description || "Active open-source project welcoming contributors."}
                  </p>

                  {/* Reasons / Highlights */}
                  {m.reasons && m.reasons.length > 0 && (
                    <ul className="mt-3 space-y-1.5 pt-2 border-t border-white/[0.04]">
                      {m.reasons.slice(0, 2).map((reason) => (
                        <li
                          key={reason}
                          className="flex items-start gap-1.5 text-[11px] text-[#d4d4d4] font-sans leading-tight"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                          <span className="line-clamp-1">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Footer Bar: Meta Tags & Link */}
                <div className="mt-3.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#a3a3a3] font-mono">
                  <div className="flex items-center gap-2">
                    {tier && (
                      <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                        {tier}-Tier
                      </span>
                    )}
                    {m.language && (
                      <span className="flex items-center gap-1 text-zinc-300">
                        <LangLogo language={m.language} className="h-3 w-3" />
                        <span className="text-[10px]">{m.language}</span>
                      </span>
                    )}
                    {m.stars > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-400/90 text-[10px]">
                        <Star className="h-2.5 w-2.5 fill-amber-400/90" />
                        {m.stars >= 1000 ? `${(m.stars / 1000).toFixed(0)}k` : m.stars}
                      </span>
                    )}
                  </div>

                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>View</span>
                    <ArrowUpRight className="h-3 w-3" />
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
