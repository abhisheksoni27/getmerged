"use client";

import Link from "next/link";
import { LangLogo } from "@/components/LangLogo";
import { getLanguageSlug } from "@/lib/languageSlug";
import { HomeSection } from "./HomeSection";
import { RankedLanguage } from "./useHomeData";

function TierBar({ pct, className }: { pct: number; className: string }) {
  if (pct <= 0) return null;
  return <div style={{ width: `${pct}%` }} className={`h-full ${className} transition-all`} />;
}

/** Ecosystem rankings: top welcoming language ecosystems. */
export function EcosystemRankings({ languages }: { languages: RankedLanguage[] }) {
  return (
    <HomeSection maxWidth="7xl" className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] font-display tracking-tight">Top Welcoming Ecosystems</h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
          Ranked by a composite index of maintainer merge velocity (70%) and active ecosystem opportunity depth (30%).
        </p>
      </div>

      <div className="rounded-xl bg-[rgba(17,24,39,0.7)] border border-[var(--border-subtle)] p-6 sm:p-10 shadow-xs backdrop-blur-md">
        <div className="divide-y divide-[var(--border-subtle)]">
          {languages.map((item, idx) => {
            const rankMedal = idx === 0 ? "01" : idx === 1 ? "02" : idx === 2 ? "03" : `${idx + 1 < 10 ? `0${idx + 1}` : idx + 1}`;
            return (
              <div
                key={item.language}
                className="py-5 first:pt-2 last:pb-2 group transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span className="font-mono text-sm font-semibold text-[var(--purple-bright)] w-8">#{rankMedal}</span>
                    <div className="h-10 w-10 rounded-lg bg-[#0D111A] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 shadow-2xs">
                      <LangLogo language={item.language} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link prefetch={false}
                          href={`/rankings/${getLanguageSlug(item.language)}`}
                          title={`Top Welcoming Open-Source ${item.language} Repositories`}
                          className="text-base sm:text-lg font-bold text-[var(--text-primary)] hover:text-[var(--purple-bright)] transition-colors tracking-tight font-sans"
                        >
                          {item.language}
                        </Link>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] font-sans mt-0.5">
                        <strong className="text-[var(--text-primary)] font-medium">{item.sCount + item.aCount}</strong> welcoming projects, avg{" "}
                        <strong className="text-[var(--green-bright)] font-medium">{item.avg_merge_rate ? `${item.avg_merge_rate.toFixed(0)}%` : "84%"}</strong>{" "}
                        acceptance.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 shrink-0 font-sans pl-11 lg:pl-0">
                    <div className="flex flex-col gap-1.5 w-full sm:w-56">
                      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span className="font-medium font-mono text-[11px]">Tier Spread</span>
                        <span className="font-mono text-xs">{item.grandTotal} repos</span>
                      </div>
                      <div
                        className="h-2 w-full rounded-full bg-[#0D111A] border border-[var(--border-subtle)] flex overflow-hidden"
                        title={`S: ${item.sCount}, A: ${item.aCount}, B: ${item.bCount}, C/D: ${item.cCount + item.dCount}`}
                      >
                        <TierBar pct={item.sPct} className="bg-[var(--purple-bright)]" />
                        <TierBar pct={item.aPct} className="bg-[var(--green-bright)]" />
                        <TierBar pct={item.bPct} className="bg-[var(--amber-bright)]" />
                        <TierBar
                          pct={item.cPct + item.dPct}
                          className="bg-[#21262D]"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-[var(--text-tertiary)]">
                        <span className="text-[var(--purple-bright)] font-semibold">{item.sCount} S</span>
                        <span className="text-[var(--green-bright)] font-semibold">{item.aCount} A</span>
                        <span className="text-[var(--amber-bright)] font-semibold">{item.bCount} B</span>
                        <span className="text-[var(--text-tertiary)]">
                          {item.cCount + item.dCount} C/D
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <div className="text-[11px] text-[var(--text-tertiary)] uppercase font-medium font-mono">Welcoming</div>
                        <div className="text-sm font-bold font-mono text-[var(--text-primary)]">{item.sCount + item.aCount}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-[var(--text-tertiary)] uppercase font-medium font-mono">Score</div>
                        <div className="inline-block px-3 py-1 rounded-md bg-[#21262D] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono font-semibold text-xs">
                          {item.score.toFixed(1)} pts
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </HomeSection>
  );
}
