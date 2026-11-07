"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { useSearch } from "@/context/SearchContext";
import { Eyebrow, HomeSection } from "./HomeSection";

const HEALTH_CHECKS = [
  "Median Review Wait < 24h",
  "Outside PR Merge Rate > 65%",
  "Multiple Active Reviewers",
  "Active Good First Issues",
];

/** Maintainer full-width CTA banner. */
export function MaintainerCta() {
  const { openSearch } = useSearch();

  return (
    <HomeSection className="py-8">
      <div className="rounded-none bg-white border-2 border-black p-8 sm:p-12 shadow-[4px_4px_0px_0px_#000]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <Eyebrow>
              <ShieldCheck className="h-3.5 w-3.5" /> For Maintainers
            </Eyebrow>
            <h2 className="text-2xl sm:text-4xl font-black text-black tracking-tight font-display uppercase">
              Maintain an open source repo? See your contributor experience.
            </h2>
            <p className="text-xs sm:text-sm text-neutral-800 font-mono leading-relaxed">
              Discover your review response grade, outside PR merge rates, and where prospective contributors might encounter bottlenecks.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openSearch()}
                className="inline-flex items-center gap-2 px-5 py-3 bg-black text-[#FACC15] hover:bg-[#FACC15] hover:text-black font-mono text-xs font-black uppercase rounded-none border-2 border-black shadow-[3px_3px_0px_0px_#000] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <Search className="h-3.5 w-3.5" /> Check Your Repository
              </button>
              <Link prefetch={false}
                href="/guides/how-to-know-if-maintainer-will-review"
                title="Maintainer Best Practices"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#FFFDF8] border-2 border-black text-black font-mono text-xs font-black uppercase rounded-none hover:bg-neutral-100 shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Read Playbook <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-[#FFFDF8] border-2 border-black rounded-none p-6 sm:p-7 shadow-[3px_3px_0px_0px_#000] space-y-4 font-mono text-xs">
            <div className="font-black uppercase tracking-wider text-black border-b-2 border-black pb-3 flex items-center justify-between">
              <span>Maintainer Health Check</span>
              <span className="bg-[#10B981] text-black border border-black px-1.5 py-0.5 text-[10px]">Live</span>
            </div>
            <div className="space-y-2.5 pt-1">
              {HEALTH_CHECKS.map((check) => (
                <div key={check} className="flex items-center gap-2.5 text-black font-bold uppercase">
                  <CheckCircle2 className="h-4 w-4 text-black fill-[#10B981] shrink-0" />
                  <span>{check}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HomeSection>
  );
}
