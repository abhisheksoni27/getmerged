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
        <h2 className="text-3xl sm:text-4xl font-black text-black font-display uppercase tracking-tight">Top welcoming ecosystems</h2>
        <p className="mt-4 text-xs sm:text-sm text-neutral-700 leading-relaxed font-mono">
          Ranked by a composite index of maintainer merge velocity (70%) and active ecosystem opportunity depth (30%).
        </p>
      </div>

      <div className="rounded-none bg-white border-2 border-black p-6 sm:p-10 shadow-[4px_4px_0px_0px_#000]">
        <div className="divide-y-2 divide-black">
          {languages.map((item, idx) => {
            const rankMedal = idx === 0 ? "01" : idx === 1 ? "02" : idx === 2 ? "03" : `${idx + 1 < 10 ? `0${idx + 1}` : idx + 1}`;
            return (
              <motion.div
                key={item.language}
                transition={{ duration: 0.35, ease: EASE_OUT_EXPO, delay: idx * 0.05 }}
                className="py-5 first:pt-2 last:pb-2 group transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black text-black w-8">#{rankMedal}</span>
                    <div className="h-10 w-10 rounded-none bg-[#FFFDF8] border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000]">
                      <LangLogo language={item.language} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link prefetch={false}
                          href={`/rankings/${getLanguageSlug(item.language)}`}
                          title={`Top Welcoming Open-Source ${item.language} Repositories`}
                          className="text-lg font-black text-black hover:text-[#2563EB] transition-colors tracking-tight hover:underline font-mono uppercase"
                        >
                          {item.language}
                        </Link>
                      </div>
                      <p className="text-xs text-neutral-700 font-mono mt-0.5">
                        <strong className="text-black">{item.sCount + item.aCount}</strong> welcoming projects, avg{" "}
                        <strong className="text-black">{item.avg_merge_rate ? `${item.avg_merge_rate.toFixed(0)}%` : "84%"}</strong>{" "}
                        acceptance.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 shrink-0 font-mono pl-9 lg:pl-0">
                    <div className="flex flex-col gap-1.5 w-full sm:w-56">
                      <div className="flex items-center justify-between text-xs font-mono text-neutral-700">
                        <span className="font-bold uppercase">Tier Spread</span>
                        <span className="font-mono text-xs">{item.grandTotal} repos</span>
                      </div>
                      <div
                        className="h-3.5 w-full rounded-none bg-neutral-100 flex overflow-hidden border-2 border-black"
                        title={`S: ${item.sCount}, A: ${item.aCount}, B: ${item.bCount}, C/D: ${item.cCount + item.dCount}`}
                      >
                        <TierBar pct={item.sPct} className="bg-[#FACC15]" />
                        <TierBar pct={item.aPct} className="bg-[#10B981]" />
                        <TierBar pct={item.bPct} className="bg-[#38BDF8]" />
                        <TierBar
                          pct={item.cPct + item.dPct}
                          className="bg-neutral-400"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-black font-black">{item.sCount} S</span>
                        <span className="text-black font-black">{item.aCount} A</span>
                        <span className="text-black font-black">{item.bCount} B</span>
                        <span className="text-neutral-600 font-bold">
                          {item.cCount + item.dCount} C/D
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0 font-mono">
                      <div>
                        <div className="text-[11px] text-neutral-600 uppercase font-bold">Welcoming</div>
                        <div className="text-sm font-black text-black">{item.sCount + item.aCount}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-neutral-600 uppercase font-bold">Score</div>
                        <div className="inline-block px-2.5 py-1 rounded-none bg-[#FACC15] border-2 border-black text-black font-black text-xs shadow-[2px_2px_0px_0px_#000]">
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
