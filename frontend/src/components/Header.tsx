"use client";

import React, { useEffect, useState } from "react";
import { Bookmark, Search, Menu, X, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      document.cookie = "opendoor_token=; Path=/; Max-Age=0; SameSite=Lax";
    }
    setUser(null);
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Navigation */}
        <div className="flex items-center gap-3 md:gap-4 lg:gap-6 min-w-0">
          <Link
            href="/"
            title="GetMerged - Find Welcoming Open Source Repositories"
            className="flex items-center gap-2.5 group shrink-0"
          >
            <motion.div
              className="shrink-0"
              whileHover={reduceMotion ? undefined : { scale: 1.05 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              aria-hidden="true"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
              >
                <rect width="32" height="32" rx="8" fill="#0a0f0d" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
                <rect x="5" y="9" width="6" height="3" rx="0.5" fill="#10b981" />
                <rect x="12" y="11" width="4" height="3" rx="0.5" fill="#34d399" />
                <rect x="5" y="20" width="6" height="3" rx="0.5" fill="#ff3b30" />
                <rect x="12" y="18" width="4" height="3" rx="0.5" fill="#ff9500" />
                <rect x="17" y="13.5" width="7" height="5" rx="0.75" fill="#10b981" />
                <rect x="25" y="15" width="2" height="2" fill="#ffffff" />
                <rect x="19" y="9.5" width="2" height="2" fill="#38bdf8" />
                <rect x="19" y="20.5" width="2" height="2" fill="#f59e0b" />
              </svg>
            </motion.div>
            <span className="font-space text-sm font-bold tracking-tight text-white group-hover:text-white transition-colors">
              Get<span className="text-[#10b981]">Merged</span>
            </span>
          </Link>

          {/* Desktop & Laptop Nav Links */}
          <nav className="hidden md:flex items-center gap-2.5 lg:gap-3.5 xl:gap-4 text-xs font-sans font-medium text-[#a3a3a3] shrink-0">
            <Link href="/repos" title="Explore All Open Source Repositories" className="hover:text-white transition-colors">
              Repositories
            </Link>
            <Link href="/how-c-rank-works" title="How C-Rank Evaluates Repositories" className="hover:text-white transition-colors">
              How C-Rank Works
            </Link>
            <Link href="/rankings" title="Browse Open Source Rankings by Language" className="hover:text-white transition-colors">
              Ecosystems
            </Link>
            <Link href="/good-first-issue" title="Find Beginner Friendly Good First Issues" className="hover:text-white transition-colors">
              Good First Issues
            </Link>
            <Link href="/talent" title="Verified Contributor Talent Pass" className="hover:text-white transition-colors">
              Talent Pass
            </Link>
            <Link href="/pricing" title="Claim Repositories & Fast-Track Features" className="hover:text-white transition-colors">
              Maintainers
            </Link>
          </nav>
        </div>

        {/* Global Search Pill */}
        <div className="flex-1 max-w-sm mx-2 sm:mx-4 hidden sm:block">
          {isSearchVisible && (
            <button
              type="button"
              onClick={handleOpenSearch}
              title="Search Repositories (Cmd+K)"
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#141414]/70 hover:bg-[#1a1a1a] hover:border-white/[0.16] text-[#737373] hover:text-[#a3a3a3] transition-all text-xs font-sans group cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="h-3.5 w-3.5 text-[#525252] group-hover:text-[#a3a3a3] transition-colors shrink-0" />
                <span className="truncate">
                  {displayQuery ? `Search: "${displayQuery}"` : placeholderText || "Search repositories by name, language or topic..."}
                </span>
              </div>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-[#525252] bg-white/[0.04] border border-white/[0.06] rounded shrink-0">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          )}
        </div>

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
              <button
                type="button"
                onClick={handleLogout}
                title="Log out of GetMerged"
                className="flex items-center justify-center h-6 w-6 text-[#a3a3a3] hover:text-rose-400 rounded-md transition-colors border-l border-white/[0.08] ml-0.5 pl-1.5 shrink-0 cursor-pointer"
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
                className="inline-flex items-center gap-2 rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-white hover:bg-[#262626] hover:border-white/[0.16] px-3.5 sm:px-4 py-1.5 text-xs font-semibold active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer shrink-0"
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

          {/* Mobile Menu Toggle Button (< md screens) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-white/[0.08] bg-[#141414] text-[#a3a3a3] hover:text-white hover:border-white/[0.16] hover:bg-[#1c1c1c] transition-colors"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden border-t border-white/[0.08] bg-[#0d0d0e]/95 backdrop-blur-2xl px-4 py-4 space-y-3 overflow-hidden"
          >
            <nav className="flex flex-col space-y-2.5 text-sm font-medium text-[#a3a3a3]">
              <Link
                href="/repos"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                Repositories
              </Link>
              <Link
                href="/how-c-rank-works"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                How C-Rank Works
              </Link>
              <Link
                href="/rankings"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                Ecosystems
              </Link>
              <Link
                href="/good-first-issue"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                Good First Issues
              </Link>
              <Link
                href="/stack"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-emerald-400 font-semibold transition-colors flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Stalk Stack
              </Link>
              <Link
                href="/maintainers"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                For Maintainers ⚡
              </Link>
              <Link
                href="/talent"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-blue-400 font-semibold transition-colors"
              >
                WorkDone Database 💼
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-emerald-400 font-semibold transition-colors"
              >
                Pricing & Plans 💳
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white font-bold transition-colors"
              >
                Dashboard
              </Link>
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              )}
              <Link
                href="/league"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-[#ff6b00] font-semibold transition-colors flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-[#ff6b00] animate-pulse" />
                Monthly League
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
