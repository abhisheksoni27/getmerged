import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Repo } from "@/types/opendoor";
import { RepoCard } from "@/components/RepoCard";
import { getLanguageSlug } from "@/lib/languageSlug";

interface SimilarReposProps {
  relatedRepos: Repo[];
  language?: string;
}

export function SimilarRepos({ relatedRepos, language }: SimilarReposProps) {
  if (!relatedRepos || relatedRepos.length === 0) return null;

  return (
    <div
      data-testid="similar-repos-rail"
      className="rounded-3xl glass-panel p-6 sm:p-8 border border-white/[0.1] shadow-xs mb-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/[0.1]">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-space">
            <Sparkles className="h-4 w-4 text-emerald-600" /> Similar Welcoming Repositories
          </h3>
          <p className="text-xs text-zinc-300 font-sans mt-0.5">
            Alternative open-source projects with active maintainers in{" "}
            <strong className="text-white">{language || "this language"}</strong>.
          </p>
        </div>
        {language && (
          <Link
            href={`/rankings/${getLanguageSlug(language)}`}
            title={`View all ${language} rankings on GetMerged`}
            className="text-xs font-semibold text-white hover:text-zinc-300 font-sans flex items-center gap-1 glass-card px-3 py-1.5 rounded-xl border border-white/[0.1]"
          >
            View all {language} rankings <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {relatedRepos.map((relRepo) => (
          <RepoCard key={relRepo.id || relRepo.full_name} repo={relRepo} />
        ))}
      </div>
    </div>
  );
}
