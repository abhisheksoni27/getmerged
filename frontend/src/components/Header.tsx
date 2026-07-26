"use client";

import React, { useEffect, useState } from "react";
import { DoorOpen, LogOut, User, Star } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export function Header() {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [starCount, setStarCount] = useState<number | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("opendoor_token") : null;
    if (token) {
      setTimeout(() => setUserToken(token), 0);
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
    localStorage.removeItem("opendoor_token");
    setUserToken(null);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-xs group-hover:scale-105 transition-transform">
            <DoorOpen className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-base font-bold tracking-tight text-zinc-900">opendoor</span>
            <span className="font-mono text-[10px] text-zinc-600 -mt-1">C-Rank™ Leaderboard</span>
          </div>
        </Link>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* GitHub Star Nudge Button */}
          <a
            href="https://github.com/abhisheksoni27/opendoor"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50/80 px-3.5 py-1.5 text-xs font-mono font-medium text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 transition-all shadow-xs group"
          >
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform" />
            <span>Star on GitHub</span>
            {starCount !== null && (
              <span className="rounded-full bg-zinc-200/80 px-2 py-0.2 text-[11px] font-bold text-zinc-800 ml-0.5">
                {starCount.toLocaleString()}
              </span>
            )}
          </a>

          {userToken ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-medium text-emerald-700 border border-emerald-200">
                <User className="h-3 w-3" /> Contributor
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <a
              href={`${API_BASE_URL}/api/v1/auth/github`}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium font-mono text-white shadow-xs hover:bg-zinc-800 active:scale-95 transition-all"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Sign in with GitHub
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
