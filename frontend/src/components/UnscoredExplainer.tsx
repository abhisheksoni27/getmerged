import React from "react";
import Link from "next/link";
import { Info, ArrowRight } from "lucide-react";
import { getLanguageSlug } from "@/lib/languageSlug";
import { InstantScanPanel } from "@/components/InstantScanPanel";

interface UnscoredExplainerProps {
  fullName: string;
  language?: string;
}

export function UnscoredExplainer({ fullName, language }: UnscoredExplainerProps) {
  const rankingsHref = language ? `/rankings/${getLanguageSlug(language)}` : "/rankings";
  const titleId = `unscored-explainer-title-${fullName.replace(/[^a-zA-Z0-9-]/g, "-")}`;

  return (
    <div className="mb-8">
      {/* Instant Repo Check: on-demand C-Rank instead of a "come back later" dead-end */}
      <InstantScanPanel fullName={fullName} />
      <div
        data-testid="unscored-explainer"
        role="region"
        aria-labelledby={titleId}
        className="rounded-3xl glass-card/70 p-6 sm:p-7 border border-[var(--border-subtle)] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
      >
        <div className="flex items-start gap-3.5 max-w-3xl">
          <Info className="h-5 w-5 text-[var(--text-secondary)] shrink-0 mt-0.5" />
          <div>
            <h2 id={titleId} className="font-space text-base font-bold text-[var(--text-primary)] tracking-tight">
              {fullName} is currently Unscored
            </h2>
            <p className="text-sm text-[var(--text-secondary)] font-sans mt-1 leading-relaxed">
              This repository has no indexed public pull request reviews or activity on
              GitHub yet. Some large projects conduct code reviews via external tooling or
              private repositories. As soon as public PR review activity is recorded,
              C-Rank™ computes scores automatically.
            </p>
          </div>
        </div>
        <Link prefetch={false}
          href={rankingsHref}
          title={`Explore active, welcoming open-source ${language || "repositories"} on GetMerged`}
          className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2 shrink-0 transition-colors"
        >
          Explore active &amp; welcoming alternatives
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}