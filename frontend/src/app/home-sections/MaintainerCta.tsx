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
        className="rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-8 sm:p-12 shadow-sm"
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <Eyebrow className="text-[#0D9668]">
                <ShieldCheck className="h-3.5 w-3.5" /> For Maintainers
              </Eyebrow>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight font-display">
                Maintain an open source repo? See your contributor experience.
              </h2>
              <p className="text-base text-[var(--text-secondary)] font-sans leading-relaxed">
                Discover your review response grade, outside PR merge rates, and where prospective contributors might encounter bottlenecks.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openSearch()}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--color-primary)] text-white font-mono text-xs font-bold rounded-xl hover:bg-[var(--color-primary)]/90 shadow-sm cursor-pointer transition-colors"
                >
                  <Search className="h-3.5 w-3.5" /> Check Your Repository
                </button>
                <Link prefetch={false}
                  href="/guides/how-to-know-if-maintainer-will-review"
                  title="Maintainer Best Practices"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-xs font-bold rounded-xl hover:bg-[var(--bg-elevated)] shadow-sm transition-colors"
                >
                  Read Playbook <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-7 shadow-sm space-y-4 font-mono text-xs">
              <div className="font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-3 flex items-center justify-between">
                <span>Maintainer Health Check</span>
                <span className="text-[#0D9668]">Live</span>
              </div>
              <div className="space-y-2.5 pt-1">
                {HEALTH_CHECKS.map((check) => (
                  <div key={check} className="flex items-center gap-2.5 text-[var(--text-secondary)]">
                    <CheckCircle2 className="h-4 w-4 text-[#0D9668] shrink-0" />
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
