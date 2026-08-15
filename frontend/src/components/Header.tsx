"use client";

import React, { useEffect, useState } from "react";
import { LogOut, Search } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { User } from "@/types/opendoor";
import posthog from "posthog-js";

interface HeaderProps {
  showSearchBar?: boolean;
  onOpenSearch?: () => void;
  searchQuery?: string;
  placeholderText?: string;
}

export function Header({ showSearchBar, onOpenSearch, searchQuery, placeholderText }: HeaderProps = {}) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const hasToken = typeof document !== "undefined" && document.cookie.includes("opendoor_token=");
    if (!hasToken) {
      setAuthLoading(false);
      return;
    }
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
  }, []);

  const handleLogout = () => {
    posthog.capture("user_signed_out");
    posthog.reset();
    document.cookie = "opendoor_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    setUser(null);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-[#faf9f6]/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Main Nav */}
        <div className="flex items-center gap-6 shrink-0">
          <Link
            href="/"
            title="opendoor - Find Welcoming Open Source Repositories"
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-space font-bold text-xs shadow-xs group-hover:scale-105 transition-transform duration-200">
              <span>OD</span>
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#dfd0b8]" />
            </div>
            <div className="flex flex-col">
              <span className="font-space text-base font-bold tracking-tight text-zinc-900">opendoor</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-xs font-sans font-medium text-zinc-600">
            <Link href="/how-c-rank-works" className="hover:text-zinc-900 transition-colors">
              How C-Rank™ Works
            </Link>
            <Link href="/rankings" className="hover:text-zinc-900 transition-colors">
              Ecosystems
            </Link>
            <Link href="/good-first-issue" className="hover:text-zinc-900 transition-colors">
              Good First Issues
            </Link>
          </nav>
        </div>

        {/* Snapped Sticky Search Bar */}
        {showSearchBar && (
          <div className="flex-1 max-w-md mx-4 animate-fade-slide-up">
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full relative flex items-center justify-between rounded-xl border border-zinc-200 bg-white/90 px-3.5 py-2 shadow-xs hover:border-zinc-300 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                <Search className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 shrink-0 transition-colors" />
                <span className="text-xs text-zinc-700 truncate font-sans">
                  {searchQuery || placeholderText || "Search repositories..."}
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-500">
                <span>⌘</span>K
              </kbd>
            </button>
          </div>
        )}

        {/* Header Right Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {authLoading ? (
            <div className="h-9 w-28 rounded-xl bg-zinc-200/60 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2.5 bg-white border border-zinc-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="h-6 w-6 rounded-full shrink-0 ring-1 ring-zinc-200"
                />
              ) : null}
              <span className="font-sans text-xs font-semibold text-zinc-900 max-w-[100px] truncate">
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <a
              href={`${API_BASE_URL}/api/v1/auth/github`}
              onClick={() => posthog.capture("github_sign_in_clicked", { source: "header" })}
              title="Sign in with GitHub"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
            >
              <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>Sign in with GitHub</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
