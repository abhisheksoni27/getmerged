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
    <header className="sticky top-0 z-50 w-full border-b-2 border-black bg-[#FFFDF8]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Navigation */}
        <div className="flex items-center gap-3 md:gap-4 lg:gap-6 min-w-0">
          <Link prefetch={false}
            href="/"
            title="GetMerged - Find Welcoming Open Source Repositories"
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="shrink-0 flex items-center justify-center h-9 w-9 bg-black border-2 border-black shadow-[2px_2px_0px_0px_#FACC15]">
              <span className="font-mono font-black text-sm text-[#FACC15] tracking-tighter">&gt;_</span>
            </div>
            <span className="font-space text-base font-black tracking-tighter text-black uppercase">
              Get<span className="bg-[#FACC15] px-1 ml-0.5 border border-black shadow-[1px_1px_0px_0px_#000]">Merged</span>
            </span>
          </Link>

          {/* Desktop & Laptop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs font-mono font-bold text-black shrink-0">
            <Link prefetch={false} href="/repos" title="Explore All Open Source Repositories" className="px-2.5 py-1 border border-transparent hover:border-black hover:bg-[#F4F4EE] transition-all">
              REPOSITORIES
            </Link>
            <Link prefetch={false} href="/good-first-issue" title="Explore Beginner Friendly Good First Issues" className="px-2.5 py-1 border border-transparent hover:border-black hover:bg-[#F4F4EE] transition-all whitespace-nowrap">
              GOOD FIRST ISSUES
            </Link>
            <Link prefetch={false} href="/stack" title="Find Good First Issues in Your Tech Stack" className="px-2.5 py-1 border border-black bg-[#10B981]/15 text-black hover:bg-[#10B981]/30 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-[1px_1px_0px_0px_#000]">
              <span className="w-2 h-2 bg-[#10B981] border border-black inline-block" />
              STACK SCANNER
            </Link>
            <Link prefetch={false} href="/maintainers" title="Claim Your Repository & PR Telemetry" className="px-2.5 py-1 border border-transparent hover:border-black hover:bg-[#F4F4EE] transition-all whitespace-nowrap">
              MAINTAINERS
            </Link>
            {user && (
              <Link prefetch={false} href="/dashboard" title="Contributor PR Tracker & Quests" className="px-2.5 py-1 border-2 border-black bg-[#FACC15] text-black font-black whitespace-nowrap shadow-[2px_2px_0px_0px_#000]">
                DASHBOARD
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
              className="w-full relative flex items-center justify-between h-9 rounded-none border-2 border-black bg-white hover:bg-[#F4F4EE] px-3 transition-all cursor-pointer group text-left shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 mr-2">
                <Search className="h-3.5 w-3.5 text-black shrink-0" />
                <span className="text-xs text-black font-mono truncate block">
                  {displayQuery || placeholderText || "SEARCH..."}
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 border border-black bg-[#FACC15] px-1 py-0.2 font-mono text-[10px] font-bold text-black shrink-0">
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
            <div className="flex items-center gap-2 bg-white border-2 border-black rounded-none p-1 shrink-0 shadow-[2px_2px_0px_0px_#000]">
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
                    className="h-6 w-6 rounded-none border border-black shrink-0"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-none bg-[#FACC15] border border-black flex items-center justify-center font-bold text-black text-[11px] shrink-0 font-mono">
                    {(user.username || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </Link>
              <NotificationBell user={user} />
              <Link prefetch={false}
                href="/watchlist"
                title="My Watchlist"
                className="flex items-center justify-center h-6 w-6 text-black hover:bg-[#F4F4EE] rounded-none transition-colors border-l-2 border-black ml-0.5 pl-1.5 shrink-0"
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
                className="inline-flex items-center gap-2 rounded-none border-2 border-black bg-[#FACC15] text-black font-mono font-black uppercase px-4 py-2 text-xs shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all whitespace-nowrap cursor-pointer shrink-0"
              >
                <span>SIGN IN</span>
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
