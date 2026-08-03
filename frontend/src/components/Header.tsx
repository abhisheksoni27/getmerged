"use client";

import React, { useEffect, useState } from "react";
import { LogOut, Star } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { User } from "@/types/opendoor";
import posthog from "posthog-js";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [starCount, setStarCount] = useState<number | null>(null);

  useEffect(() => {
    // Only check authenticated user profile if token cookie exists
    const hasToken = typeof document !== "undefined" && (
      document.cookie.includes("opendoor_token=") ||
      document.cookie.includes("token=")
    );
    if (hasToken) {
      fetch(`${API_BASE_URL}/api/v1/auth/me`, { credentials: "include" })
        .then((res) => {
          if (res.ok) return res.json();
          return null;
        })
        .then((data) => {
          if (data?.user) {
            setUser(data.user);
            posthog.identify(String(data.user.github_id), {
              username: data.user.username,
            });
          }
        })
        .catch(() => {})
        .finally(() => setAuthLoading(false));
    } else {
      // Also try fetching /auth/me directly with credentials in case cookie is HttpOnly
      fetch(`${API_BASE_URL}/api/v1/auth/me`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            setUser(data.user);
            posthog.identify(String(data.user.github_id), {
              username: data.user.username,
            });
          }
        })
        .catch(() => {})
        .finally(() => setAuthLoading(false));
    }

    // Fetch live stars for opendoor repository
    fetch("https://api.github.com/repos/abhisheksoni27/opendoor")
      .then((res) => res.json())
      .then((data) => {
        if (data.stargazers_count !== undefined) {
          setStarCount(data.stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    posthog.capture('user_signed_out');
    posthog.reset();
    document.cookie = "opendoor_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    setUser(null);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#faf9f6]/95 backdrop-blur-md shadow-[0_2px_15px_rgb(0,0,0,0.01)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo matching favicon.svg */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-space font-bold text-[11px] sm:text-xs shadow-xs group-hover:scale-105 transition-transform">
            <span>OD</span>
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="font-space text-sm sm:text-base font-bold tracking-tight text-zinc-900">opendoor</span>
        </Link>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* GitHub Star Nudge Button */}
          <a
            href="https://github.com/abhisheksoni27/opendoor"
            target="_blank"
            rel="noreferrer"
            onClick={() => posthog.capture('github_star_clicked')}
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-xl bg-zinc-100/70 px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-sans font-medium text-zinc-700 hover:bg-zinc-200/60 transition-all group whitespace-nowrap cursor-pointer"
          >
            <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform shrink-0" />
            <span className="hidden xs:inline sm:inline">Star on GitHub</span>
            <span className="xs:hidden sm:hidden">Star</span>
            {starCount !== null && (
              <span className="rounded-full bg-zinc-200/50 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-bold text-zinc-800 ml-0.5 font-mono">
                {starCount.toLocaleString()}
              </span>
            )}
          </a>

          {authLoading ? (
            <div className="h-8 w-24 rounded-xl bg-zinc-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="h-6 w-6 sm:h-7 sm:w-7 rounded-full shrink-0"
                />
              ) : null}
              <span className="font-sans text-[11px] sm:text-xs font-semibold text-zinc-900 max-w-[80px] sm:max-w-none truncate">
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          ) : (
            <a
              href={`${API_BASE_URL}/api/v1/auth/github`}
              onClick={() => posthog.capture('github_sign_in_clicked', { source: 'header' })}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-zinc-900 px-3.5 py-1.5 sm:px-4.5 sm:py-2 text-[11px] sm:text-xs font-medium font-sans text-white shadow-xs hover:bg-zinc-800 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span className="hidden sm:inline">Sign in with GitHub</span>
              <span className="sm:hidden">Sign in</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
