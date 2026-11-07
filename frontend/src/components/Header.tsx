"use client";

import React, { useEffect, useState } from "react";
import { Bookmark, Search, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { User } from "@/types/opendoor";
import { NotificationBell } from "@/components/NotificationBell";
import posthog from "posthog-js";
import { AuthModal } from "@/components/AuthModal";

import { useSearch } from "@/context/SearchContext";
import { EASE_OUT_EXPO, useReducedMotion } from "@/lib/motion";
import { PAYMENTS_ENABLED } from "@/lib/flags";

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Navigation */}
        <div className="flex items-center gap-3 md:gap-4 lg:gap-6 min-w-0">
          <Link prefetch={false}
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
                <rect width="32" height="32" rx="8" fill="var(--text-primary)" stroke="var(--border-subtle)" strokeWidth="1" />
                <rect x="5" y="9" width="6" height="3" rx="0.5" fill="#0D9668" />
                <rect x="12" y="11" width="4" height="3" rx="0.5" fill="#34d399" />
                <rect x="5" y="20" width="6" height="3" rx="0.5" fill="#c4463a" />
                <rect x="12" y="18" width="4" height="3" rx="0.5" fill="#d4590f" />
                <rect x="17" y="13.5" width="7" height="5" rx="0.75" fill="#0D9668" />
                <rect x="25" y="15" width="2" height="2" fill="#ffffff" />
                <rect x="19" y="9.5" width="2" height="2" fill="#2D8ABF" />
                <rect x="19" y="20.5" width="2" height="2" fill="#c4910a" />
              </svg>
            </motion.div>
            <span className="font-space text-sm font-bold tracking-tight text-[var(--text-primary)] transition-colors">
              Get<span className="text-[#0D9668]">Merged</span>
            </span>
          </Link>

          {/* Desktop & Laptop Nav Links */}
          <nav className="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-5 text-sm font-sans font-medium text-[var(--text-secondary)] shrink-0">
            <Link prefetch={false} href="/repos" title="Explore All Open Source Repositories" className="hover:text-[var(--text-primary)] transition-colors">
              Repositories
            </Link>
            <Link prefetch={false} href="/good-first-issue" title="Explore Beginner Friendly Good First Issues" className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap">
              Good First Issues
            </Link>
            <Link prefetch={false} href="/stack" title="Find Good First Issues in Your Tech Stack" className="text-[#0D9668] hover:text-[#0b7a54] font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9668] animate-pulse" />
              Stalk Stack
            </Link>
            <Link prefetch={false} href="/maintainers" title="Claim Your Repository & PR Telemetry" className="hover:text-[var(--text-primary)] font-medium transition-colors whitespace-nowrap">
              Maintainers
            </Link>
            {user && (
              <Link prefetch={false} href="/dashboard" title="Contributor PR Tracker & Quests" className="hover:text-[var(--color-primary)] font-bold text-[var(--text-primary)] transition-colors whitespace-nowrap">
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        {/* Floating Search Button */}
        {isSearchVisible && (
          <div className="flex-1 min-w-[140px] sm:min-w-[170px] md:min-w-[200px] max-w-[260px] mx-1 sm:mx-2 shrink-0 sm:shrink">
            <button
              type="button"
              onClick={handleOpenSearch}
              className="w-full relative flex items-center justify-between h-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] px-3 transition-all cursor-pointer group text-left shadow-sm"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 mr-2">
                <Search className="h-3.5 w-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] shrink-0 transition-colors" />
                <span className="text-xs text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] truncate font-sans block">
                  {displayQuery || placeholderText || "Search repositories..."}
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--text-secondary)] shrink-0">
                <span>⌘</span>K
              </kbd>
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {authLoading ? (
            <div className="h-8 w-16 sm:w-20 rounded-xl bg-[var(--bg-elevated)] animate-pulse border border-[var(--border-subtle)]" />
          ) : user ? (
            <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-1 shrink-0 shadow-sm">
              <Link prefetch={false}
                href={user.slug ? `/u/${user.slug}` : `/dashboard`}
                title={`Signed in as @${user.username} - View Profile`}
                className="flex items-center hover:opacity-80 transition-opacity p-0.5"
              >
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="h-6 w-6 rounded-full shrink-0 ring-1 ring-[var(--border-subtle)]"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center font-bold text-[var(--text-primary)] text-[11px] shrink-0">
                    {(user.username || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </Link>
              <NotificationBell user={user} />
              <Link prefetch={false}
                href="/watchlist"
                title="My Watchlist"
                className="flex items-center justify-center h-6 w-6 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-md transition-colors border-l border-[var(--border-subtle)] ml-0.5 pl-1.5 shrink-0"
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
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] hover:bg-[var(--color-neutral-800)] px-4 py-2 text-xs font-semibold active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer shrink-0 shadow-sm"
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
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] transition-colors shadow-sm"
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
            className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 py-4 space-y-3 overflow-hidden shadow-lg"
          >
            <nav className="flex flex-col space-y-2 text-sm font-medium text-[var(--text-secondary)]">
              <Link prefetch={false}
                href="/repos"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
              >
                Repositories
              </Link>
              <Link prefetch={false}
                href="/how-c-rank-works"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
              >
                How C-Rank Works
              </Link>
              <Link prefetch={false}
                href="/rankings"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
              >
                Ecosystems
              </Link>
              <Link prefetch={false}
                href="/good-first-issue"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
              >
                Good First Issues
              </Link>
              <Link prefetch={false}
                href="/stack"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[#0D9668] font-semibold transition-colors flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-[#0D9668] animate-pulse" />
                Stalk Stack
              </Link>
              <Link prefetch={false}
                href="/maintainers"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
              >
                For Maintainers ⚡
              </Link>
              {PAYMENTS_ENABLED && (
                <Link prefetch={false}
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[#0D9668] font-semibold transition-colors"
                >
                  Pricing & Plans 💳
                </Link>
              )}
              <Link prefetch={false}
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold transition-colors"
              >
                Dashboard
              </Link>
              <Link prefetch={false}
                href="/league"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--color-primary)] font-semibold transition-colors flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                Monthly League
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
