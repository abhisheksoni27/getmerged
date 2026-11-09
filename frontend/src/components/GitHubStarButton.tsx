"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

interface GitHubStarButtonProps {
  className?: string;
  showLabel?: boolean;
}

function formatStars(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `${count}`;
}

export function GitHubStarButton({ className = "", showLabel = true }: GitHubStarButtonProps) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/github-stars")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data && typeof data.stars === "number") {
          setStars(data.stars);
        }
      })
      .catch(() => {
        // Silently ignore, fallback to star link without count
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <a
      href="https://github.com/abhisheksoni27/getmerged"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Star abhisheksoni27/getmerged on GitHub${stars !== null ? `, ${stars} stars` : ""}`}
      className={`group inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[#0D111A] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)] hover:bg-[#161B26] transition-all duration-150 shrink-0 ${className}`}
    >
      {/* GitHub Octocat Icon */}
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 fill-current text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors"
        aria-hidden="true"
      >
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>

      {showLabel && (
        <span className="hidden md:inline text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
          Star
        </span>
      )}

      {/* Star count pill / separator */}
      <span className="inline-flex items-center gap-1 pl-1 text-[11px] font-mono tabular-nums text-[var(--text-muted)] group-hover:text-amber-400 transition-colors">
        <Star className="w-3 h-3 fill-amber-400/80 text-amber-400/90" />
        {stars !== null ? (
          formatStars(stars)
        ) : (
          <span className="inline-block w-3 h-3 rounded-full bg-[var(--border-subtle)] animate-pulse" />
        )}
      </span>
    </a>
  );
}
