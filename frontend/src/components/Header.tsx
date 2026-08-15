"use client";

import React, { useEffect, useState } from "react";
import { LogOut, Search } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { User } from "@/types/opendoor";
import posthog from "posthog-js";
import { AuthModal } from "@/components/AuthModal";

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

          <nav className="hidden md:flex items-center gap-6 text-xs font-sans font-medium text-zinc-600">
            <Link href="/how-c-rank-works" title="How C-Rank Works - Scoring Algorithm and Methodology" className="nav-link-hover text-zinc-700 hover:text-zinc-950 font-semibold transition-colors">
              How C-Rank™ Works
            </Link>
            <Link href="/rankings" title="Browse Top Open Source Repositories by Language Ecosystem" className="nav-link-hover text-zinc-700 hover:text-zinc-950 font-semibold transition-colors">
              Ecosystems
            </Link>
            <Link href="/good-first-issue" title="Explore Beginner Friendly Good First Issues" className="nav-link-hover text-zinc-700 hover:text-zinc-950 font-semibold transition-colors">
              Good First Issues
            </Link>
            <Link href="/hall-of-fame" title="View Top Super Welcoming Open Source Repositories" className="nav-link-hover text-zinc-700 hover:text-zinc-950 font-semibold transition-colors">
              Hall of Fame
            </Link>
          </nav>
        </div>

        {/* Snapped Sticky Search Bar */}
        {showSearchBar && (
          <div className="flex-1 min-w-0 max-w-sm lg:max-w-md mx-3 lg:mx-4 animate-fade-slide-up">
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full relative flex items-center justify-between rounded-xl border border-zinc-200 bg-white/90 px-3 py-1.5 sm:py-2 shadow-xs hover:border-zinc-300 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 mr-2">
                <Search className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 shrink-0 transition-colors" />
                <span className="text-xs text-zinc-700 truncate font-sans block max-w-[200px] sm:max-w-none">
                  {searchQuery || placeholderText || "Search repositories..."}
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
                  title={`View your public Opendoor profile (@${user.slug})`}
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
              <button
                onClick={handleLogout}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
                title="Sign Out of Opendoor"
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
                title="Sign in to Opendoor"
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
              >
                <span>Sign in</span>
              </button>
              <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                title="Welcome to Opendoor"
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
