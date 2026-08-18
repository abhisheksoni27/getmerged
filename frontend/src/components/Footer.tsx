"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Activity, Trophy, Sparkles, Sprout } from "lucide-react";

export function Footer() {
  const rankingLangs = [
    { name: "Python", slug: "python" },
    { name: "TypeScript", slug: "typescript" },
    { name: "Go", slug: "go" },
    { name: "Rust", slug: "rust" },
    { name: "C#", slug: "csharp" },
    { name: "C++", slug: "cpp" },
    { name: "Java", slug: "java" },
    { name: "PHP", slug: "php" },
    { name: "Ruby", slug: "ruby" },
    { name: "Swift", slug: "swift" },
    { name: "Kotlin", slug: "kotlin" },
    { name: "Dart", slug: "dart" },
    { name: "Elixir", slug: "elixir" },
    { name: "Zig", slug: "zig" },
  ];

  return (
    <footer className="border-t border-zinc-200 bg-white text-zinc-600 font-sans pt-16 pb-12 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top 4-Column Directory Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
          {/* Column 1: Ecosystem Rankings */}
          <div className="space-y-3">
            <h4 className="font-bold text-zinc-900 text-xs uppercase tracking-wider font-space flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-500" /> Ecosystem Rankings
            </h4>
            <ul className="space-y-2 font-mono text-[11px] text-zinc-500">
              {rankingLangs.slice(0, 7).map((lang) => (
                <li key={`rank-${lang.slug}`}>
                  <Link
                    href={`/rankings/${lang.slug}`}
                    title={`Top Welcoming ${lang.name} Open Source Repositories`}
                    className="hover:text-zinc-900 transition-colors"
                  >
                    Top {lang.name} Repos
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: More Ecosystems */}
          <div className="space-y-3">
            <h4 className="font-bold text-zinc-900 text-xs uppercase tracking-wider font-space flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" /> More Ecosystems
            </h4>
            <ul className="space-y-2 font-mono text-[11px] text-zinc-500">
              {rankingLangs.slice(7).map((lang) => (
                <li key={`rank-more-${lang.slug}`}>
                  <Link
                    href={`/rankings/${lang.slug}`}
                    title={`Top Welcoming ${lang.name} Open Source Repositories`}
                    className="hover:text-zinc-900 transition-colors"
                  >
                    Top {lang.name} Repos
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Good First Issues */}
          <div className="space-y-3">
            <h4 className="font-bold text-zinc-900 text-xs uppercase tracking-wider font-space flex items-center gap-1.5">
              <Sprout className="h-3.5 w-3.5 text-emerald-600" /> Good First Issues
            </h4>
            <ul className="space-y-2 font-mono text-[11px] text-zinc-500">
              {rankingLangs.slice(0, 7).map((lang) => (
                <li key={`gfi-${lang.slug}`}>
                  <Link
                    href={`/good-first-issue/${lang.slug}`}
                    title={`Beginner Friendly Good First Issues in ${lang.name}`}
                    className="hover:text-zinc-900 transition-colors"
                  >
                    {lang.name} Good First Issues
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Platform & Curated Hubs */}
          <div className="space-y-3">
            <h4 className="font-bold text-zinc-900 text-xs uppercase tracking-wider font-space flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" /> Curated & Platform
            </h4>
            <ul className="space-y-2 font-mono text-[11px] text-zinc-500">
              <li>
                <Link href="/how-c-rank-works" title="How C-Rank Works - Scoring Algorithm & Formula" className="hover:text-zinc-900 transition-colors font-semibold text-zinc-800">
                  How C-Rank™ Works
                </Link>
              </li>
              <li>
                <Link href="/hall-of-fame" title="Super Welcoming Open Source Repositories" className="hover:text-zinc-900 transition-colors">
                  Hall of Fame (Super Welcoming)
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" title="Top 50 Global Leaderboard" className="hover:text-zinc-900 transition-colors">
                  Top 50 Global Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/compare" title="Compare Open Source Repositories Head-to-Head" className="hover:text-zinc-900 transition-colors">
                  Compare Repositories
                </Link>
              </li>
              <li>
                <Link href="/status" title="GetMerged Service & Pipeline Status" className="hover:text-zinc-900 transition-colors flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-600" /> System Status
                </Link>
              </li>
              <li>
                <a href="/api/v1/health" target="_blank" title="Check GetMerged API health status" className="hover:text-zinc-900 transition-colors">
                  API Health
                </a>
              </li>
              <li>
                <Link href="/privacy" title="GetMerged Privacy Policy" className="hover:text-zinc-900 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" title="GetMerged Terms of Service" className="hover:text-zinc-900 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Middle Stacked Directory Cloud */}
        <div className="border-t border-zinc-200 pt-8">
          <div className="text-xs font-space font-bold text-zinc-900 mb-3">
            Explore Open Source Repositories by Stack
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            {rankingLangs.map((lang) => (
              <Link
                key={`cloud-${lang.slug}`}
                href={`/good-first-issue/${lang.slug}`}
                className="px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-all"
              >
                {lang.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="border-t border-zinc-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div>
            © {new Date().getFullYear()} GetMerged, Glassdoor for Open Source Repositories.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" title="GetMerged Open Source Explorer Home" className="hover:text-zinc-900 transition-colors">Home</Link>
            <Link href="/hall-of-fame" title="Hall of Fame" className="hover:text-zinc-900 transition-colors">Hall of Fame</Link>
            <Link href="/leaderboard" title="Leaderboard" className="hover:text-zinc-900 transition-colors">Leaderboard</Link>
            <Link href="/status" title="System Status" className="hover:text-zinc-900 transition-colors">Status</Link>
            <Link href="/privacy" title="Privacy Policy" className="hover:text-zinc-900 transition-colors">Privacy</Link>
            <Link href="/terms" title="Terms of Service" className="hover:text-zinc-900 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
