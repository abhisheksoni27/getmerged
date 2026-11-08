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
    <HomeSection className="py-12 sm:py-16">
      <div className="card card-highlight p-8 sm:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <Eyebrow>
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--green-bright)]" /> For Maintainers
            </Eyebrow>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight font-display leading-tight">
              Maintain an open source repo?<br />See your contributor experience.
            </h2>
            <p className="text-sm text-[var(--text-secondary)] font-sans leading-relaxed">
              Discover your review response grade, outside PR merge rates, and where prospective contributors might encounter bottlenecks.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => openSearch()}
                className="scan-btn inline-flex items-center gap-2 text-xs font-semibold cursor-pointer"
              >
                <Search className="h-4 w-4" /> Check Your Repository
              </button>
              <Link prefetch={false}
                href="/guides/how-to-know-if-maintainer-will-review"
                title="Maintainer Best Practices"
                className="pill pill-purple hover:bg-[rgba(163,113,247,0.2)] transition-colors inline-flex items-center gap-1.5 px-4 py-2 cursor-pointer text-xs"
              >
                Read Playbook <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-[#04060A] border border-[var(--border-subtle)] rounded-xl p-6 sm:p-7 space-y-4">
            <div className="font-semibold text-sm text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-3 flex items-center justify-between">
              <span>Maintainer Health Check</span>
              <span className="pill pill-green">Live Telemetry</span>
            </div>
            <div className="space-y-3 pt-1">
              {HEALTH_CHECKS.map((check) => (
                <div key={check} className="flex items-center gap-3 text-[var(--text-secondary)] font-medium text-xs font-mono">
                  <CheckCircle2 className="h-4 w-4 text-[var(--green-bright)] shrink-0" />
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
