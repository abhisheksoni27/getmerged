"use client";

import React, { useEffect, useState } from "react";
import { Bookmark, LogOut, Search } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { User } from "@/types/opendoor";
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
            title="GetMerged - Find Welcoming Open Source Repositories"
            className="flex items-center gap-2.5 group shrink-0"
          >
            <motion.svg
              viewBox="0 0 32 32"
              className="h-8 w-8 rounded-lg shadow-xs"
              whileHover={reduceMotion ? undefined : { scale: 1.08 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              aria-hidden="true"
            >
                <rect width="32" height="32" rx="8" fill="#222831" />
                <text x="50%" y="54%" dominant-baseline="central" text-anchor="middle" font-family="'Space Grotesk', sans-serif" font-size="12" font-weight="700" fill="#ffffff">GM</text>
                <circle cx="25" cy="7" r="2.5" fill="#dfd0b8" />
            </motion.svg>
            <div className="flex flex-col">
              <span className="font-space text-base font-bold tracking-tight text-zinc-900">GetMerged</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-sans font-medium text-zinc-600">
            <Link href="/repos" title="Explore All Open Source Repositories" className="relative text-zinc-700 hover:text-zinc-950 font-semibold transition-colors">
              Repositories
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#ff5722] rounded-full origin-right"
                initial={{ scaleX: 0 }}
                whileHover={reduceMotion ? undefined : { scaleX: 1 }}
                transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
              />
            </Link>
            <Link href="/how-c-rank-works" title="How C-Rank Works - Scoring Algorithm and Methodology" className="relative text-zinc-700 hover:text-zinc-950 font-semibold transition-colors">
              How C-Rank™ Works
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#ff5722] rounded-full origin-right"
                initial={{ scaleX: 0 }}
                whileHover={reduceMotion ? undefined : { scaleX: 1 }}
                transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
              />
            </Link>
            <Link href="/rankings" title="Browse Top Open Source Repositories by Language Ecosystem" className="relative text-zinc-700 hover:text-zinc-950 font-semibold transition-colors">
              Ecosystems
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#ff5722] rounded-full origin-right"
                initial={{ scaleX: 0 }}
                whileHover={reduceMotion ? undefined : { scaleX: 1 }}
                transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
              />
            </Link>
            <Link href="/good-first-issue" title="Explore Beginner Friendly Good First Issues" className="relative text-zinc-700 hover:text-zinc-950 font-semibold transition-colors">
              Good First Issues
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#ff5722] rounded-full origin-right"
                initial={{ scaleX: 0 }}
                whileHover={reduceMotion ? undefined : { scaleX: 1 }}
                transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
              />
            </Link>
            <Link href="/hall-of-fame" title="View Top Super Welcoming Open Source Repositories" className="relative text-zinc-700 hover:text-zinc-950 font-semibold transition-colors">
              Hall of Fame
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#ff5722] rounded-full origin-right"
                initial={{ scaleX: 0 }}
                whileHover={reduceMotion ? undefined : { scaleX: 1 }}
                transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
              />
            </Link>
          </nav>
        </div>

        {/* Snapped Sticky Search Bar */}
        {isSearchVisible && (
          <div className="flex-1 min-w-0 max-w-sm lg:max-w-md mx-3 lg:mx-4 animate-fade-slide-up">
            <button
              type="button"
              onClick={handleOpenSearch}
              aria-label="Search repositories"
              className="nb-opt-out w-full relative flex items-center justify-between h-9 sm:h-10 rounded-xl border border-zinc-200 bg-white/90 px-3 py-1.5 sm:py-2 shadow-xs hover:border-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none transition-all active:scale-[0.99] cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 mr-2">
                <Search className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 shrink-0 transition-colors" />
                <span className="text-xs text-zinc-700 truncate font-sans block max-w-[200px] sm:max-w-none">
                  {displayQuery || placeholderText || "Search repositories..."}
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-500 shrink-0">
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
                      className="h-6 w-6 rounded-full shrink-0 ring-1 ring-zinc-200"
                    />
                  ) : null}
                  <span className="font-sans text-xs font-semibold text-zinc-900 max-w-[100px] truncate">
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
                      className="h-6 w-6 rounded-full shrink-0 ring-1 ring-zinc-200"
                    />
                  ) : null}
                  <span className="font-sans text-xs font-semibold text-zinc-900 max-w-[100px] truncate">
                    {user.username}
                  </span>
                </div>
              )}
              <Link
                href="/watchlist"
                title="My Watchlist"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-sans font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors border-l border-zinc-200/80 pl-2.5 ml-0.5"
              >
                <Bookmark className="h-3.5 w-3.5 text-zinc-500" />
                <span className="hidden sm:inline">My Watchlist</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-zinc-500 hover:text-zinc-700 transition-colors cursor-pointer"
                title="Sign Out of GetMerged"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
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
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
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
