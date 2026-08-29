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
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Navigation */}
        <div className="flex items-center gap-4 lg:gap-6 min-w-0 shrink-0">
          <Link
            href="/"
            title="GetMerged - Find Welcoming Open Source Repositories"
            className="flex items-center gap-2.5 group shrink-0"
          >
            <motion.div
              className="relative h-8 w-8 rounded-lg bg-[#222831] border border-white/[0.12] flex items-center justify-center shadow-xs"
              whileHover={reduceMotion ? undefined : { scale: 1.05 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              aria-hidden="true"
            >
              <span className="font-space text-xs font-bold text-white tracking-tight leading-none">GM</span>
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#dfd0b8] ring-1 ring-[#222831] shadow-[0_0_4px_rgba(223,208,184,0.6)]" />
            </motion.div>
            <span className="font-space text-sm font-bold tracking-tight text-white group-hover:text-white transition-colors">
              GetMerged
            </span>
          </Link>

          <nav className="hidden xl:flex items-center gap-3.5 2xl:gap-5 text-xs font-sans font-medium text-[#a3a3a3] shrink-0">
            <Link href="/repos" title="Explore All Open Source Repositories" className="hover:text-white transition-colors">
              Repositories
            </Link>
            <Link href="/how-c-rank-works" title="How C-Rank Works - Scoring Algorithm and Methodology" className="hover:text-white transition-colors whitespace-nowrap">
              How C-Rank Works
            </Link>
            <Link href="/rankings" title="Browse Top Open Source Repositories by Language Ecosystem" className="hover:text-white transition-colors">
              Ecosystems
            </Link>
            <Link href="/good-first-issue" title="Explore Beginner Friendly Good First Issues" className="hover:text-white transition-colors whitespace-nowrap">
              Good First Issues
            </Link>
            <Link href="/guides" title="Open Source Contribution Guides and Best Practices" className="hover:text-white transition-colors">
              Guides
            </Link>
            <Link href="/league" title="Monthly Open-Source Contributor League & Active Sprints" className="text-[#ff6b00] hover:text-[#ff8a33] font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00] animate-pulse" />
              Monthly League
            </Link>
          </nav>
        </div>

        {/* Floating Search Button */}
        {isSearchVisible && (
          <div className="flex-1 min-w-[130px] sm:min-w-[160px] md:min-w-[180px] max-w-[260px] mx-1.5 sm:mx-3 shrink-0 sm:shrink">
            <button
              type="button"
              onClick={handleOpenSearch}
              aria-label="Search repositories"
              className="w-full relative flex items-center justify-between h-9 rounded-lg border border-white/[0.08] bg-[#141414] hover:border-white/[0.16] hover:bg-[#1c1c1c] px-2.5 sm:px-3 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 mr-2">
                <Search className="h-3.5 w-3.5 text-[#a3a3a3] group-hover:text-[#d4d4d4] shrink-0 transition-colors" />
                <span className="text-xs text-[#a3a3a3] group-hover:text-[#d4d4d4] truncate font-sans block">
                  {displayQuery || placeholderText || "Search repositories..."}
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#a3a3a3] shrink-0">
                <span>⌘</span>K
              </kbd>
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {authLoading ? (
            <div className="h-8 w-16 sm:w-20 rounded-lg bg-[#1c1c1c] animate-pulse border border-white/[0.04]" />
          ) : user ? (
            <div className="flex items-center gap-1.5 bg-[#141414] border border-white/[0.08] rounded-lg p-1 shrink-0">
              <Link
                href={user.slug ? `/u/${user.slug}` : `/dashboard`}
                title={`Signed in as @${user.username} - View Profile`}
                className="flex items-center hover:opacity-80 transition-opacity p-0.5"
              >
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="h-6 w-6 rounded-full shrink-0 ring-1 ring-white/[0.12]"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-orange-600 flex items-center justify-center font-bold text-white text-[11px] shrink-0">
                    {(user.username || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </Link>
              <NotificationBell user={user} />
              <Link
                href="/watchlist"
                title="My Watchlist"
                className="flex items-center justify-center h-6 w-6 text-[#a3a3a3] hover:text-white rounded-md transition-colors border-l border-white/[0.08] ml-0.5 pl-1.5 shrink-0"
              >
                <Bookmark className="h-3.5 w-3.5" />
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
                className="inline-flex items-center gap-2 rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-white hover:bg-[#262626] hover:border-white/[0.16] px-4 py-1.5 text-xs font-semibold active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer shrink-0"
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
