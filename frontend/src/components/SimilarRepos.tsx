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
    <div className="rounded-3xl bg-white p-6 sm:p-8 border border-zinc-200/80 shadow-xs mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-100">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 font-space">
            <Sparkles className="h-4 w-4 text-emerald-600" /> Similar Welcoming Repositories
          </h3>
          <p className="text-xs text-zinc-600 font-sans mt-0.5">
            Alternative open-source projects with active maintainers in{" "}
            <strong className="text-zinc-900">{language || "this language"}</strong>.
          </p>
        </div>
        {language && (
          <Link
            href={`/rankings/${getLanguageSlug(language)}`}
            title={`View all ${language} rankings on GetMerged`}
            className="text-xs font-semibold text-zinc-900 hover:text-zinc-700 font-sans flex items-center gap-1 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200"
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
