"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Problem / Solution: The Contributor Paradox */
export function ProblemSolution() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mb-16">
      <div className="card card-highlight p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <h3 className="sec-title text-xl sm:text-2xl font-bold">The Contributor Paradox</h3>
          <Link
            prefetch={false}
            href="/how-c-rank-works"
            className="pill pill-purple hover:bg-[rgba(163,113,247,0.2)] transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>Read C-Rank Methodology</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <p className="text-sm text-[var(--text-secondary)] font-sans max-w-3xl leading-relaxed mb-6">
          Developers usually pick repositories by GitHub star count. But top repositories often have closed triage rings, 3-month review delays, and reject over 70% of outside community pull requests. GetMerged tracks empirical metrics that actually predict PR landing:
        </p>

        <div className="grid-3">
          <div className="p-4 rounded-lg bg-[#04060A] border border-[var(--border-subtle)]">
            <div className="font-mono text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              01. External PR Merge Rate
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Filters out internal core-team commits to measure actual community pull request acceptance.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#04060A] border border-[var(--border-subtle)]">
            <div className="font-mono text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              02. P50 First Maintainer Review
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Median elapsed time from PR submission until the first substantive human review comment.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#04060A] border border-[var(--border-subtle)]">
            <div className="font-mono text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              03. First-Timer Landing Ratio
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Tracks whether developers with zero prior commits in this repository get their first PR merged.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
