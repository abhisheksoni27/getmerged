import { Globe, Loader2, Pin, Star } from "lucide-react";
import type { UserPublicRepo } from "@/lib/public-profile";

interface ReposSectionProps {
  repos: UserPublicRepo[];
  pinnedRepos: string[];
  loading: boolean;
  onTogglePin: (fullName: string) => void;
}

export function ReposSection({ repos, pinnedRepos, loading, onTogglePin }: ReposSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold font-sans text-white">Public Repositories</h3>
          <p className="text-xs text-[var(--text-secondary)] font-sans mt-0.5">
            Select repositories to pin at the top of your profile.
          </p>
        </div>
        {loading && <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />}
      </div>

      {repos.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)] font-sans">
          No public repositories found. Connect your GitHub account to auto-import your top-starred projects.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {repos.map((repo) => {
            const isPinned = pinnedRepos.includes(repo.full_name);
            return (
              <button
                key={repo.full_name}
                type="button"
                onClick={() => onTogglePin(repo.full_name)}
                className={`p-3 rounded-xl border text-left flex items-start justify-between gap-2 transition-all cursor-pointer ${
                  isPinned
                    ? "bg-amber-950/30 border-amber-500/60 text-white"
                    : "bg-black/40 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-black/60"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--text-primary)] truncate">
                    <Globe className="h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0" />
                    <span className="truncate">{repo.name || repo.full_name}</span>
                  </div>
                  {repo.description && (
                    <p className="text-[11px] text-[var(--text-secondary)] font-sans line-clamp-2 mt-1">
                      {repo.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-[var(--text-secondary)]">
                    {repo.language && <span className="text-[var(--text-secondary)]">{repo.language}</span>}
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {repo.stars}
                    </span>
                  </div>
                </div>

                <div
                  className={`p-1.5 rounded-md ${
                    isPinned
                      ? "bg-amber-500 text-black"
                      : "bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Pin className="h-3.5 w-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
