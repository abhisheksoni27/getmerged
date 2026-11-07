"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LangLogo } from "@/components/LangLogo";
import { getLanguageSlug } from "@/lib/languageSlug";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { HomeSection } from "./HomeSection";
import { RankedLanguage } from "./useHomeData";

function TierBar({ pct, className }: { pct: number; className: string }) {
  if (pct <= 0) return null;
  return <div style={{ width: `${pct}%` }} className={`h-full ${className} transition-all`} />;
}

/** Ecosystem rankings: top welcoming language ecosystems. */
export function EcosystemRankings({ languages }: { languages: RankedLanguage[] }) {
  return (
    <HomeSection maxWidth="7xl" className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] font-display">Top welcoming ecosystems</h2>
        <p className="mt-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-sans">
          Ranked by a composite index of maintainer merge velocity (70%) and active ecosystem opportunity depth (30%).
        </p>
      </div>

      <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-10 shadow-sm">
        <div className="divide-y divide-[var(--border-subtle)]">
          {languages.map((item, idx) => {
            const rankMedal = idx === 0 ? "1" : idx === 1 ? "2" : idx === 2 ? "3" : `${idx + 1}`;
            return (
              <motion.div
                key={item.language}
                transition={{ duration: 0.35, ease: EASE_OUT_EXPO, delay: idx * 0.05 }}
                className="py-5 first:pt-2 last:pb-2 group transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[var(--text-tertiary)] w-6">#{rankMedal}</span>
                    <div className="h-10 w-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                      <LangLogo language={item.language} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link prefetch={false}
                          href={`/rankings/${getLanguageSlug(item.language)}`}
                          title={`Top Welcoming Open-Source ${item.language} Repositories`}
                          className="text-lg font-bold text-[var(--text-primary)] hover:text-[var(--color-primary)] transition-colors tracking-tight hover:underline font-sans"
                        >
                          {item.language}
                        </Link>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] font-sans mt-0.5">
                        <strong className="text-[var(--text-primary)]">{item.sCount + item.aCount}</strong> welcoming projects, avg{" "}
                        <strong className="text-[var(--text-primary)]">{item.avg_merge_rate ? `${item.avg_merge_rate.toFixed(0)}%` : "84%"}</strong>{" "}
                        acceptance.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 shrink-0 font-mono pl-9 lg:pl-0">
                    <div className="flex flex-col gap-1.5 w-full sm:w-56">
                      <div className="flex items-center justify-between text-xs font-sans text-[var(--text-secondary)]">
                        <span>Tier Spread</span>
                        <span className="font-mono text-xs">{item.grandTotal} repos</span>
                      </div>
                      <div
                        className="h-2.5 w-full rounded-full bg-[var(--bg-elevated)] p-0.5 flex overflow-hidden border border-[var(--border-subtle)]"
                        title={`S: ${item.sCount}, A: ${item.aCount}, B: ${item.bCount}, C/D: ${item.cCount + item.dCount}`}
                      >
                        <TierBar pct={item.sPct} className="bg-[#C4910A] rounded-l-full first:rounded-l-full last:rounded-r-full" />
                        <TierBar pct={item.aPct} className="bg-[#0D9668] first:rounded-l-full last:rounded-r-full" />
                        <TierBar pct={item.bPct} className="bg-[#2D8ABF] first:rounded-l-full last:rounded-r-full" />
                        <TierBar
                          pct={item.cPct + item.dPct}
                          className="bg-[#9C958E] rounded-r-full first:rounded-l-full last:rounded-r-full"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-[var(--text-tertiary)]">
                        <span className="text-[#C4910A] font-semibold">{item.sCount} S</span>
                        <span className="text-[#0D9668] font-semibold">{item.aCount} A</span>
                        <span className="text-[#2D8ABF] font-semibold">{item.bCount} B</span>
                        <span>
                          {item.cCount + item.dCount} C/D
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <div className="text-xs text-[var(--text-tertiary)] font-sans">Welcoming</div>
                        <div className="text-sm font-bold text-[var(--text-primary)]">{item.sCount + item.aCount}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--text-tertiary)] font-sans">Score</div>
                        <div className="inline-block px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs">
                          {item.score.toFixed(1)} pts
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </HomeSection>
  );
}
