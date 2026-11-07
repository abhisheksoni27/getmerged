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
        <h2 className="text-3xl sm:text-4xl font-bold text-zinc-950 font-sans tracking-tight">Top Welcoming Ecosystems</h2>
        <p className="mt-3 text-sm text-zinc-500 leading-relaxed font-sans">
          Ranked by a composite index of maintainer merge velocity (70%) and active ecosystem opportunity depth (30%).
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-zinc-200/90 p-6 sm:p-10 shadow-xs">
        <div className="divide-y divide-zinc-100">
          {languages.map((item, idx) => {
            const rankMedal = idx === 0 ? "01" : idx === 1 ? "02" : idx === 2 ? "03" : `${idx + 1 < 10 ? `0${idx + 1}` : idx + 1}`;
            return (
              <div
                key={item.language}
                className="py-5 first:pt-2 last:pb-2 group transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span className="font-mono text-sm font-semibold text-zinc-400 w-8">#{rankMedal}</span>
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                      <LangLogo language={item.language} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link prefetch={false}
                          href={`/rankings/${getLanguageSlug(item.language)}`}
                          title={`Top Welcoming Open-Source ${item.language} Repositories`}
                          className="text-base sm:text-lg font-bold text-zinc-900 hover:text-blue-600 transition-colors tracking-tight font-sans"
                        >
                          {item.language}
                        </Link>
                      </div>
                      <p className="text-xs text-zinc-500 font-sans mt-0.5">
                        <strong className="text-zinc-800 font-medium">{item.sCount + item.aCount}</strong> welcoming projects, avg{" "}
                        <strong className="text-zinc-800 font-medium">{item.avg_merge_rate ? `${item.avg_merge_rate.toFixed(0)}%` : "84%"}</strong>{" "}
                        acceptance.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 shrink-0 font-sans pl-11 lg:pl-0">
                    <div className="flex flex-col gap-1.5 w-full sm:w-56">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="font-medium">Tier Spread</span>
                        <span className="font-mono text-xs">{item.grandTotal} repos</span>
                      </div>
                      <div
                        className="h-2 w-full rounded-full bg-zinc-100 flex overflow-hidden"
                        title={`S: ${item.sCount}, A: ${item.aCount}, B: ${item.bCount}, C/D: ${item.cCount + item.dCount}`}
                      >
                        <TierBar pct={item.sPct} className="bg-emerald-500" />
                        <TierBar pct={item.aPct} className="bg-sky-500" />
                        <TierBar pct={item.bPct} className="bg-amber-400" />
                        <TierBar
                          pct={item.cPct + item.dPct}
                          className="bg-zinc-300"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                        <span className="text-zinc-800 font-semibold">{item.sCount} S</span>
                        <span className="text-zinc-800 font-semibold">{item.aCount} A</span>
                        <span className="text-zinc-800 font-semibold">{item.bCount} B</span>
                        <span className="text-zinc-500">
                          {item.cCount + item.dCount} C/D
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <div className="text-[11px] text-zinc-400 uppercase font-medium">Welcoming</div>
                        <div className="text-sm font-bold font-mono text-zinc-900">{item.sCount + item.aCount}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-zinc-400 uppercase font-medium">Score</div>
                        <div className="inline-block px-3 py-1 rounded-full bg-zinc-100 text-zinc-800 font-mono font-semibold text-xs">
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
