"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useSearch } from "@/context/SearchContext";
import { EASE_OUT_EXPO } from "@/lib/motion";
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
      <motion.div
        className="rounded-xl bg-[#141414] border border-white/[0.08] p-8 sm:p-10"
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <Eyebrow className="text-[#10b981]">
                <ShieldCheck className="h-3.5 w-3.5" /> For Maintainers
              </Eyebrow>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">
                Maintain an open source repo? See your contributor experience.
              </h2>
              <p className="text-sm text-[#a3a3a3] font-sans leading-relaxed">
                Discover your review response grade, outside PR merge rates, and where prospective contributors might encounter bottlenecks.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openSearch()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-mono text-xs font-bold rounded-lg hover:bg-[#ff8a33] cursor-pointer transition-colors"
                >
                  <Search className="h-3.5 w-3.5" /> Check Your Repository
                </button>
                <Link
                  href="/guides/how-to-know-if-maintainer-will-review"
                  title="Maintainer Best Practices"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1c1c1c] border border-white/[0.08] text-white font-mono text-xs font-bold rounded-lg hover:bg-[#262626] transition-colors"
                >
                  Read Playbook <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-xl p-6 space-y-3 font-mono text-xs">
              <div className="font-bold text-white border-b border-white/[0.08] pb-2 flex items-center justify-between">
                <span>Maintainer Health Check</span>
                <span className="text-[#10b981]">Live</span>
              </div>
              <div className="space-y-2 pt-1">
                {HEALTH_CHECKS.map((check) => (
                  <div key={check} className="flex items-center gap-2 text-[#a3a3a3]">
                    <CheckCircle2 className="h-4 w-4 text-[#10b981] shrink-0" />
                    <span>{check}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </motion.div>
    </HomeSection>
  );
}
