import React from "react";
import Link from "next/link";
import { Check, Bookmark, GitPullRequest, Star, Scale } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";
import { getLanguageSlug } from "@/lib/languageSlug";
import { Repo } from "@/types/opendoor";

interface RepoDetailHeroProps {
  fullName: string;
  repo: Repo | null;
  rank: string;
  rankLabel: string;
  score: number;
  isWatching: boolean;
  watchLoading: boolean;
  onWatchToggle: () => void;
  onGithubClick: () => void;
}

export function RepoDetailHero({
  fullName,
  repo,
  rankLabel,
  score,
  isWatching,
  watchLoading,
  onWatchToggle,
  onGithubClick,
}: RepoDetailHeroProps) {
  const owner = repo?.owner || fullName.split("/")[0];
  const ownerAvatarUrl = `https://github.com/${owner}.png`;
  const roundedScore = Math.round(score);

  return (
    <div className="border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs rounded-3xl mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 transition-all">
      <div className="flex items-start gap-4 sm:gap-5 flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ownerAvatarUrl}
          alt={owner}
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl border border-zinc-200 bg-zinc-50 shrink-0 object-cover shadow-2xs"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="inline-flex items-center px-3 py-1 font-mono text-xs font-bold rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300">
              {rankLabel}
            </span>
            {roundedScore > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 font-mono text-xs font-bold rounded-xl bg-zinc-900 text-white shadow-2xs">
                <span>C-Rank Score:</span>
                <span className="text-emerald-400">{roundedScore}</span>
                <span className="text-zinc-400 font-normal">/100</span>
              </span>
            )}
            {typeof repo?.stars === "number" && repo.stars >= 0 && (
              <span
                title={`${repo.stars.toLocaleString()} GitHub stars`}
                className="inline-flex items-center gap-1.5 border border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-xs font-semibold rounded-xl text-zinc-700 shadow-2xs"
              >
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                <span>{repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}</span>
              </span>
            )}
            {repo?.language && (
              <Link
                href={`/rankings/${getLanguageSlug(repo.language)}`}
                title={`View Top Welcoming Open-Source ${repo.language} Projects`}
                className="inline-flex items-center gap-1.5 border border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-xs font-semibold rounded-xl text-zinc-700 hover:border-zinc-300 transition-colors"
              >
                <LangLogo language={repo.language} />
                <span>{repo.language}</span>
              </Link>
            )}
            {repo?.updated_at && (
              <span
                title={`Last indexed and scored on ${new Date(repo.updated_at).toUTCString()}`}
                className="inline-flex items-center gap-1.5 border border-zinc-200/90 bg-zinc-50 px-3 py-1 font-mono text-[11px] text-zinc-500 rounded-xl"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Updated: {new Date(repo.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-space text-zinc-900 break-all tracking-tight leading-tight">
            {fullName}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-600 max-w-2xl leading-relaxed font-sans">
            {repo?.description || "Public GitHub repository indexed and scored by maintainer responsiveness for contributor accessibility."}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/compare?a=${encodeURIComponent(fullName)}`}
            title={`Compare ${fullName} with another repository`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold font-sans rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 transition-all shadow-xs cursor-pointer"
          >
            <Scale className="h-4 w-4 text-zinc-500" />
            <span>Compare</span>
          </Link>
          <button
            onClick={onWatchToggle}
            disabled={watchLoading}
            className={`inline-flex items-center gap-2 border rounded-xl px-5 py-2.5 text-xs font-semibold font-sans transition-all cursor-pointer shadow-xs ${
              isWatching
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300"
            }`}
          >
            {isWatching ? <Check className="h-4 w-4 text-emerald-600" /> : <Bookmark className="h-4 w-4 text-zinc-500" />}
            {isWatching ? "Watching Repo" : "Watch Repo"}
          </button>
          <a
            href={repo?.github_url || `https://github.com/${fullName}`}
            target="_blank"
            rel="nofollow noopener noreferrer"
            onClick={onGithubClick}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-semibold font-sans text-white hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
          >
            <GitPullRequest className="h-4 w-4" />
            <span>GitHub</span>
          </a>
        </div>
        <p className="text-xs font-sans text-zinc-500 max-w-xs text-left md:text-right leading-normal">
          Get alerts when review velocity or rank updates.
        </p>
      </div>
    </div>
  );
}
