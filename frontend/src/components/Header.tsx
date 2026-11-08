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
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Navigation */}
        <div className="flex items-center gap-4 lg:gap-8 min-w-0">
          <Link prefetch={false}
            href="/"
            title="GetMerged - Find Welcoming Open Source Repositories"
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-zinc-900 text-white shadow-xs">
              <span className="font-mono font-bold text-xs tracking-tighter">&gt;_</span>
            </div>
            <span className="text-base font-bold tracking-tight text-zinc-900 font-sans">
              Get<span className="text-emerald-600">Merged</span>
            </span>
          </Link>

          {/* Desktop & Laptop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-zinc-600 shrink-0">
            <Link prefetch={false} href="/repos" title="Explore All Open Source Repositories" className="px-3 py-1.5 rounded-lg hover:text-zinc-900 hover:bg-zinc-100 transition-colors">
              Repositories
            </Link>
            <Link prefetch={false} href="/good-first-issue" title="Explore Beginner Friendly Good First Issues" className="px-3 py-1.5 rounded-lg hover:text-zinc-900 hover:bg-zinc-100 transition-colors whitespace-nowrap">
              Good First Issues
            </Link>
            <Link prefetch={false} href="/stack" title="Find Good First Issues in Your Tech Stack" className="px-3 py-1.5 rounded-lg hover:text-zinc-900 hover:bg-zinc-100 transition-colors flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Stack Scanner
            </Link>
            <Link prefetch={false} href="/maintainers" title="Claim Your Repository & PR Telemetry" className="px-3 py-1.5 rounded-lg hover:text-zinc-900 hover:bg-zinc-100 transition-colors whitespace-nowrap">
              Maintainers
            </Link>
            {user && (
              <Link prefetch={false} href="/dashboard" title="Contributor PR Tracker & Quests" className="px-3 py-1.5 rounded-lg font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap">
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        {/* Floating Search Button */}
        {isSearchVisible && (
          <div className="flex-1 min-w-[140px] sm:min-w-[180px] md:min-w-[220px] max-w-[280px] mx-2 shrink-0 sm:shrink">
            <button
              type="button"
              onClick={handleOpenSearch}
              className="w-full relative flex items-center justify-between h-9 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100/80 px-3 transition-colors cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 mr-2">
                <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="text-xs text-zinc-500 truncate block font-sans">
                  {displayQuery || placeholderText || "Search repositories..."}
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 border border-zinc-200 bg-white px-1.5 py-0.5 rounded text-[10px] text-zinc-500 font-mono shrink-0">
                <span>⌘</span>K
              </kbd>
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {authLoading ? (
            <div className="h-8 w-16 sm:w-20 rounded-lg bg-zinc-100 animate-pulse border border-zinc-200" />
          ) : user ? (
            <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg p-1 shrink-0 shadow-xs">
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
                    className="h-6 w-6 rounded-full border border-zinc-200 shrink-0"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0 font-mono">
                    {(user.username || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </Link>
              <NotificationBell user={user} />
              <Link prefetch={false}
                href="/watchlist"
                title="My Watchlist"
                className="flex items-center justify-center h-6 w-6 text-zinc-600 hover:text-zinc-900 rounded-md transition-colors border-l border-zinc-200 ml-0.5 pl-1.5 shrink-0"
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
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 text-white font-medium px-4 py-2 text-xs shadow-xs hover:bg-zinc-800 transition-colors whitespace-nowrap cursor-pointer shrink-0"
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
