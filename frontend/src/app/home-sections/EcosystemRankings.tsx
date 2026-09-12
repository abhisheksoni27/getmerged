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
        <h2 className="text-2xl sm:text-3xl font-bold text-white lg:text-4xl font-sans">Top welcoming ecosystems</h2>
        <p className="mt-4 text-xs sm:text-sm lg:text-base text-[#a3a3a3] leading-relaxed font-sans">
          Ranked by a composite index of maintainer merge velocity (70%) and active ecosystem opportunity depth (30%).
        </p>
      </div>

      <div className="rounded-xl bg-[#141414] border border-white/[0.08] p-6 sm:p-10">
        <div className="divide-y divide-white/[0.08]">
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
                    <span className="font-mono text-sm font-bold text-[#737373] w-6">#{rankMedal}</span>
                    <div className="h-10 w-10 rounded-lg bg-[#1c1c1c] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <LangLogo language={item.language} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/rankings/${getLanguageSlug(item.language)}`}
                          title={`Top Welcoming Open-Source ${item.language} Repositories`}
                          className="text-lg font-bold text-white group-hover:text-[#a3a3a3] transition-colors tracking-tight hover:underline font-sans"
                        >
                          {item.language}
                        </Link>
                      </div>
                      <p className="text-xs text-[#737373] font-sans mt-0.5">
                        <strong className="text-[#d4d4d4]">{item.sCount + item.aCount}</strong> welcoming projects, avg{" "}
                        <strong className="text-[#d4d4d4]">{item.avg_merge_rate ? `${item.avg_merge_rate.toFixed(0)}%` : "84%"}</strong>{" "}
                        acceptance.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 shrink-0 font-mono pl-9 lg:pl-0">
                    <div className="flex flex-col gap-1 w-full sm:w-56">
                      <div className="flex items-center justify-between text-[11px] font-sans text-[#737373]">
                        <span>Tier Spread</span>
                        <span className="font-mono text-[10px]">{item.grandTotal} repos</span>
                      </div>
                      <div
                        className="h-2.5 w-full rounded-full bg-[#1c1c1c] p-0.5 flex overflow-hidden border border-white/[0.04]"
                        title={`S: ${item.sCount}, A: ${item.aCount}, B: ${item.bCount}, C/D: ${item.cCount + item.dCount}`}
                      >
                        <TierBar pct={item.sPct} className="bg-[#fbbf24] rounded-l-full first:rounded-l-full last:rounded-r-full" />
                        <TierBar pct={item.aPct} className="bg-[#10b981] first:rounded-l-full last:rounded-r-full" />
                        <TierBar pct={item.bPct} className="bg-[#38bdf8] first:rounded-l-full last:rounded-r-full" />
                        <TierBar
                          pct={item.cPct + item.dPct}
                          className="bg-[#525252] rounded-r-full first:rounded-l-full last:rounded-r-full"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#737373]">
                        <span className="text-[#fbbf24] font-semibold">{item.sCount} S</span>
                        <span className="text-[#10b981] font-semibold">{item.aCount} A</span>
                        <span className="text-[#38bdf8] font-semibold">{item.bCount} B</span>
                        <span>
                          {item.cCount + item.dCount} C/D
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <div className="text-[11px] text-[#737373] font-sans">Welcoming</div>
                        <div className="text-sm font-bold text-white">{item.sCount + item.aCount}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-[#737373] font-sans">Score</div>
                        <div className="inline-block px-2.5 py-1 rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-white font-bold text-xs">
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
