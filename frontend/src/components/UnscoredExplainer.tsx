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
        className="rounded-3xl bg-[#1e293b]/70 p-6 sm:p-7 border border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
      >
        <div className="flex items-start gap-3.5 max-w-3xl">
          <Info className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <h2 id={titleId} className="font-space text-base font-bold text-slate-100 tracking-tight">
              {fullName} is currently Unscored
            </h2>
            <p className="text-sm text-slate-400 font-sans mt-1 leading-relaxed">
              This repository has no indexed public pull request reviews or maintainer telemetry on
              GitHub. Some large projects conduct code reviews via external tooling (e.g. Gerrit,
              Phabricator) or internal monorepos. As soon as public PR review activity is recorded,
              C-Rank™ computes objective scores automatically.
            </p>
          </div>
        </div>
        <Link
          href={rankingsHref}
          title={`Explore verified-welcoming open-source ${language || "repositories"} on GetMerged`}
          className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 shrink-0 transition-colors"
        >
          Explore verified-welcoming alternatives
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}