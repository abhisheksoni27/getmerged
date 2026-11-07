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
    <HomeSection className="py-16 sm:py-24">
      <div className="rounded-2xl bg-white border border-zinc-200/90 p-8 sm:p-12 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <Eyebrow>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> For Maintainers
            </Eyebrow>
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-950 tracking-tight font-sans leading-tight">
              Maintain an open source repo?<br />See your contributor experience.
            </h2>
            <p className="text-base text-zinc-600 font-sans leading-relaxed">
              Discover your review response grade, outside PR merge rates, and where prospective contributors might encounter bottlenecks.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => openSearch()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white hover:bg-zinc-800 font-sans text-sm font-medium rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                <Search className="h-4 w-4" /> Check Your Repository
              </button>
              <Link prefetch={false}
                href="/guides/how-to-know-if-maintainer-will-review"
                title="Maintainer Best Practices"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-zinc-200 text-zinc-700 font-sans text-sm font-medium rounded-xl hover:bg-zinc-50 shadow-2xs transition-colors"
              >
                Read Playbook <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="bg-zinc-50/80 border border-zinc-200/80 rounded-xl p-6 sm:p-7 space-y-4">
            <div className="font-semibold text-sm text-zinc-900 border-b border-zinc-200/60 pb-3 flex items-center justify-between">
              <span>Maintainer Health Check</span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-medium">Live</span>
            </div>
            <div className="space-y-3 pt-1">
              {HEALTH_CHECKS.map((check) => (
                <div key={check} className="flex items-center gap-3 text-zinc-800 font-medium text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
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
