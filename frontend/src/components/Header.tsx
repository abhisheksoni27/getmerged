"use client";

import React, { useEffect, useState } from "react";
import { Bookmark, Search } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { User } from "@/types/opendoor";
import { NotificationBell } from "@/components/NotificationBell";
import posthog from "posthog-js";
import { AuthModal } from "@/components/AuthModal";

import { useSearch } from "@/context/SearchContext";
import { EASE_OUT_EXPO, useReducedMotion } from "@/lib/motion";

interface HeaderProps {
  showSearchBar?: boolean;
  onOpenSearch?: () => void;
  searchQuery?: string;
  placeholderText?: string;
}

export function Header({ showSearchBar, onOpenSearch, searchQuery, placeholderText }: HeaderProps = {}) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const { openSearch, heroSearchVisible, searchQuery: contextQuery } = useSearch();

  const isSearchVisible = showSearchBar !== undefined ? showSearchBar : !heroSearchVisible;
  const handleOpenSearch = onOpenSearch || (() => openSearch());
  const displayQuery = searchQuery || contextQuery;

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
          const distinctId = data.user.slug || `user_${data.user.username}`;
          posthog.identify(distinctId, {
            username: data.user.username,
          });
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-black/75 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Navigation */}
        <div className="flex items-center gap-8 min-w-0 shrink-0">
          <Link
            href="/"
            title="GetMerged - Find Welcoming Open Source Repositories"
            className="flex items-center gap-2.5 group shrink-0"
          >
            <motion.div
              className="h-8 w-8 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/[0.15] flex items-center justify-center shadow-inner"
              whileHover={reduceMotion ? undefined : { scale: 1.05 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              aria-hidden="true"
            >
              <span className="font-space text-xs font-bold text-white tracking-tight">GM</span>
            </motion.div>
            <div className="flex flex-col">
              <span className="font-sans text-sm font-semibold tracking-tight text-zinc-100 group-hover:text-white transition-colors">
                GetMerged
              </span>
            </div>
          </Link>

          <nav className="hidden xl:flex items-center gap-6 text-xs font-sans font-medium text-zinc-400 shrink-0">
            <Link href="/repos" title="Explore All Open Source Repositories" className="hover:text-zinc-100 transition-colors">
              Repositories
            </Link>
            <Link href="/how-c-rank-works" title="How C-Rank Works - Scoring Algorithm and Methodology" className="hover:text-zinc-100 transition-colors">
              How C-Rank™ Works
            </Link>
            <Link href="/rankings" title="Browse Top Open Source Repositories by Language Ecosystem" className="hover:text-zinc-100 transition-colors">
              Ecosystems
            </Link>
            <Link href="/good-first-issue" title="Explore Beginner Friendly Good First Issues" className="hover:text-zinc-100 transition-colors">
              Good First Issues
            </Link>
            <Link href="/guides" title="Open Source Contribution Guides and Best Practices" className="hover:text-zinc-100 transition-colors">
              Guides
            </Link>
            <Link href="/hacktoberfest" title="Hacktoberfest 2026 Welcome Hub & Live Merge Tracker" className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">
              Hacktoberfest
            </Link>
          </nav>
        </div>

        {/* Floating Apple-Style Search Button */}
        {isSearchVisible && (
          <div className="flex-1 min-w-[140px] max-w-xs sm:max-w-sm mx-2">
            <button
              type="button"
              onClick={handleOpenSearch}
              aria-label="Search repositories"
              className="w-full relative flex items-center justify-between h-9 rounded-xl border border-white/[0.08] bg-zinc-900/60 hover:bg-zinc-900/90 hover:border-white/[0.15] px-3 shadow-inner focus-visible:ring-2 focus-visible:ring-orange-500 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 mr-2">
                <Search className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 shrink-0 transition-colors" />
                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 truncate font-sans block">
                  {displayQuery || placeholderText || "Search repositories..."}
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-400 shrink-0">
                <span>⌘</span>K
              </kbd>
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {authLoading ? (
            <div className="h-8 w-20 rounded-xl bg-zinc-900 animate-pulse border border-white/[0.05]" />
          ) : user ? (
            <div className="flex items-center gap-2.5 bg-zinc-900/80 border border-white/[0.08] rounded-xl px-3 py-1.5 shadow-sm shrink-0 backdrop-blur-md">
              {user.slug ? (
                <Link
                  href={`/${user.slug}`}
                  title={`View your public GetMerged profile (@${user.slug})`}
                  className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                >
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="h-6 w-6 rounded-full shrink-0 ring-1 ring-white/[0.2]"
                    />
                  ) : null}
                  <span className="font-sans text-xs font-medium text-zinc-200 max-w-[90px] truncate">
                    {user.username}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="h-6 w-6 rounded-full shrink-0 ring-1 ring-white/[0.2]"
                    />
                  ) : null}
                  <span className="font-sans text-xs font-medium text-zinc-200 max-w-[90px] truncate">
                    {user.username}
                  </span>
                </div>
              )}
              <NotificationBell user={user} />
              <Link
                href="/watchlist"
                title="My Watchlist"
                className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-sans font-medium text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors border-l border-white/[0.08] pl-2.5 shrink-0"
              >
                <Bookmark className="h-3.5 w-3.5 text-zinc-400" />
                <span className="hidden md:inline">Watchlist</span>
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  posthog.capture("sign_in_modal_opened", { source: "header" });
                  setIsAuthModalOpen(true);
                }}
                title="Sign in to GetMerged"
                className="inline-flex items-center gap-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-1.5 text-xs font-semibold shadow-sm active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer shrink-0"
              >
                <span>Sign in</span>
              </button>
              <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                title="Welcome to GetMerged"
                description="Sign in to unlock full repository metrics, track maintainer velocity, and submit contributor reviews."
                source="header"
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
