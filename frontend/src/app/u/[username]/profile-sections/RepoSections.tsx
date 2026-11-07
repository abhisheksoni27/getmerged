"use client";

import React from "react";
import Link from "next/link";
import type { PublicProfile } from "@/lib/public-profile";
import { ProjectCard } from "@/components/ProjectCard";
import { CRankBadge } from "@/components/CRankBadge";
import { LangLogo } from "@/components/LangLogo";
import { ExternalLink, FolderGit2, Pin, ShieldCheck, Sparkles, Star } from "lucide-react";

interface RepoSectionsProps {
  profile: PublicProfile;
  showcaseProjects: NonNullable<PublicProfile["showcase_projects"]>;
  publicRepos: NonNullable<PublicProfile["public_repos"]>;
  isOwner: boolean;
  onOpenEdit: () => void;
}

export const RepoSections: React.FC<RepoSectionsProps> = ({
  profile,
  showcaseProjects,
  publicRepos,
  isOwner,
  onOpenEdit,
}) => {
  if (!profile) return null;
  return (
    <>
      {/* Section 2: Featured Showcase Projects (Private & Public Work with Photos) */}
      {showcaseProjects.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-bold font-sans text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Featured Project Showcases ({showcaseProjects.length})
            </h2>
            {isOwner && (
              <button
                type="button"
                onClick={onOpenEdit}
                className="text-xs font-mono text-amber-400 hover:text-amber-300"
              >
                Manage Showcases →
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showcaseProjects.map((proj) => (
              <ProjectCard key={proj.id} project={proj} />
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Auto-Imported Public Repositories (Sorted by Stars) */}
      {publicRepos.length > 0 && (
        <div className="mb-8 rounded-xl glass-panel p-6 border border-white/[0.1] shadow-sm border-t-2 border-t-slate-700">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold font-sans text-white flex items-center gap-2">
                <FolderGit2 className="h-4 w-4 text-blue-400" />
                Top Public Repositories ({publicRepos.length})
              </h2>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Auto-imported from GitHub and ranked by community stars.
              </p>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={onOpenEdit}
                className="text-xs font-mono text-amber-400 hover:text-amber-300"
              >
                Pin Repos →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicRepos.map((repo) => (
              <a
                key={repo.full_name}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--brand-terracotta)] hover:shadow-xs transition-all flex flex-col justify-between group shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--brand-terracotta)] transition-colors truncate">
                      {repo.name || repo.full_name}
                    </span>
                    {repo.is_pinned && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-[#C4910A] text-[10px] font-mono border border-amber-200 shrink-0">
                        <Pin className="h-2.5 w-2.5" /> Pinned
                      </span>
                    )}
                  </div>
                  {repo.description ? (
                    <p className="text-xs text-[var(--text-secondary)] font-sans line-clamp-2 mt-1.5 leading-relaxed">
                      {repo.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-[var(--border-subtle)] text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    {repo.language && <LangLogo language={repo.language} />}
                    <span>{repo.language || "Code"}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[#C4910A] font-semibold">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    {repo.stars.toLocaleString()}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Section 7: Elite Repositories Merged Into */}
      <div className="mb-8 rounded-2xl bg-[var(--bg-surface)] p-6 border border-[var(--border-subtle)] shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-bold font-sans text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#0D9668]" />
            Verified Repository Merges ({profile.repos.length})
          </h2>
          <span className="text-xs font-mono text-[var(--text-muted)]">Ranked by C-Rank™ Tier</span>
        </div>

        {profile.repos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-8 text-center text-xs text-[var(--text-muted)] font-sans">
            No merged repository records logged yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile.repos.map((repo) => (
              <div
                key={repo.full_name}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 hover:border-[var(--brand-terracotta)] transition-colors"
              >
                <Link prefetch={false}
                  href={`/${repo.full_name}`}
                  title={`View ${repo.full_name} scorecard and merge metrics`}
                  className="truncate text-sm font-semibold font-sans text-[var(--text-primary)] hover:text-[var(--brand-terracotta)] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{repo.full_name}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                </Link>
                <div className="shrink-0">
                  <CRankBadge rank={repo.c_rank_tier} size="sm" showLabel={false} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
