"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, GitPullRequest } from "lucide-react";

export function Header() {
  const [user, setUser] = useState<{ username: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    // Check local authentication state
    const token = typeof window !== "undefined" ? localStorage.getItem("opendoor_token") : null;
    if (token) {
      fetch("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) setUser(data.user);
        })
        .catch(() => {});
    }
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-mono text-sm font-bold group-hover:bg-zinc-800 transition-colors">
            OD
          </div>
          <span className="font-mono text-lg font-bold tracking-tight text-zinc-900">
            opendoor<span className="text-emerald-600">.</span>
          </span>
        </Link>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-600 hidden sm:inline">
                @{user.username}
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem("opendoor_token");
                  setUser(null);
                  window.location.reload();
                }}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <a
              href="http://localhost:8080/api/v1/auth/github"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 active:scale-95 transition-all"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              Sign in with GitHub
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
