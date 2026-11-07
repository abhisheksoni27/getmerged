"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Sparkles, Flame } from "lucide-react";

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
    <footer className="border-t border-zinc-200/80 bg-zinc-50/60 text-zinc-600 font-sans pt-16 pb-12 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Directory Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-xs">
          {/* Column 1: Ecosystem Rankings */}
          <div className="space-y-3">
            <h3 className="font-semibold text-zinc-950 text-xs uppercase tracking-wider font-sans">
              Ecosystems
            </h3>
            <ul className="space-y-2.5 font-sans text-xs text-zinc-500">
              {rankingLangs.slice(0, 7).map((lang) => (
                <li key={`rank-${lang.slug}`}>
                  <Link
                    href={`/rankings/${lang.slug}`}
                    prefetch={false}
                    title={`Top Welcoming ${lang.name} Open Source Repositories`}
                    className="hover:text-zinc-900 transition-colors"
                  >
                    {`Top ${lang.name} Repos`}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: More Ecosystems & Topics */}
          <div className="space-y-3">
            <h3 className="font-semibold text-zinc-950 text-xs uppercase tracking-wider font-sans">
              More Ecosystems
            </h3>
            <ul className="space-y-2.5 font-sans text-xs text-zinc-500">
              {rankingLangs.slice(7).map((lang) => (
                <li key={`rank-more-${lang.slug}`}>
                  <Link
                    href={`/rankings/${lang.slug}`}
                    prefetch={false}
                    title={`Top Welcoming ${lang.name} Open Source Repositories`}
                    className="hover:text-zinc-900 transition-colors"
                  >
                    {`Top ${lang.name} Repos`}
                  </Link>
                </li>
              ))}
              <li className="pt-1">
                <Link
                  href="/topics"
                  prefetch={false}
                  title="Explore GitHub Repositories by Topic & Category"
                  className="text-zinc-900 font-medium hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>Explore All Topics &rarr;</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Good First Issues */}
          <div className="space-y-3">
            <h3 className="font-semibold text-zinc-950 text-xs uppercase tracking-wider font-sans">
              Good First Issues
            </h3>
            <ul className="space-y-2.5 font-sans text-xs text-zinc-500">
              {rankingLangs.slice(0, 6).map((lang) => (
                <li key={`gfi-${lang.slug}`}>
                  <Link
                    href={`/good-first-issue/${lang.slug}`}
                    prefetch={false}
                    title={`Beginner Friendly Good First Issues in ${lang.name}`}
                    className="hover:text-zinc-900 transition-colors"
                  >
                    {`${lang.name} Issues`}
                  </Link>
                </li>
              ))}
              <li className="pt-1">
                <Link
                  href="/good-first-issue"
                  prefetch={false}
                  title="Explore All Good First Issues Across All Languages"
                  className="text-zinc-900 font-medium hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>All Good First Issues &rarr;</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Curated Discovery Collections */}
          <div className="space-y-3">
            <h3 className="font-semibold text-zinc-950 text-xs uppercase tracking-wider font-sans">
              Discovery
            </h3>
            <ul className="space-y-2.5 font-sans text-xs text-zinc-500">
              <li>
                <Link prefetch={false} href="/league" title="Monthly Open-Source Contributor League & Active Sprints" className="text-zinc-700 hover:text-zinc-950 transition-colors flex items-center gap-1.5">
                  <Flame className="h-3 w-3 fill-amber-400 text-amber-500" />
                  Monthly League Sprint
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/community-powerhouses" title="Open Source Repositories with 3+ Active Maintainers" className="text-zinc-700 hover:text-zinc-950 transition-colors flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  Community Powerhouses
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/hall-of-fame" title="S-Tier Welcoming Hall of Fame Repositories" className="hover:text-zinc-900 transition-colors">
                  Hall of Fame (S-Tier)
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/leaderboard" title="Fastest PR Review Turnaround Leaderboard" className="hover:text-zinc-900 transition-colors">
                  Review Velocity Board
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/repos" title="Complete Directory of Scored GitHub Repositories" className="hover:text-zinc-900 transition-colors">
                  Repository Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Platform & Methodology */}
          <div className="space-y-3">
            <h3 className="font-semibold text-zinc-950 text-xs uppercase tracking-wider font-sans">
              Platform
            </h3>
            <ul className="space-y-2.5 font-sans text-xs text-zinc-500">
              <li>
                <Link prefetch={false} href="/pricing" title="Pro Contributor, Recruiter Pass & Maintainer Plans" className="text-zinc-900 font-medium hover:text-blue-600 transition-colors">
                  Pricing & Plans
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/dashboard" title="Contributor PR Tracker, Quests & Reputation" className="hover:text-zinc-900 transition-colors">
                  Contributor Dashboard
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/maintainers" title="Maintainer Claim Portal & PR Telemetry" className="text-zinc-900 font-medium hover:text-blue-600 transition-colors">
                  For Maintainers
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/stack" title="Find Good First Issues in Your Dependencies" className="hover:text-zinc-900 transition-colors">
                  Stalk My Stack
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/how-c-rank-works" title="How C-Rank Works - Scoring Algorithm and Methodology" className="hover:text-zinc-900 transition-colors">
                  How C-Rank Works
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/compare" title="Compare GitHub Repositories Side-by-Side" className="hover:text-zinc-900 transition-colors">
                  Compare Repositories
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/guides" title="Open Source Contribution Best Practices & Playbooks" className="hover:text-zinc-900 transition-colors">
                  Contribution Guides
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/about" title="About GetMerged" className="hover:text-zinc-900 transition-colors">
                  About GetMerged
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/status" title="System Status & Live Indexing" className="hover:text-zinc-900 transition-colors">
                  System Status
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Metadata Bar */}
        <div className="border-t border-zinc-200/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-zinc-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-zinc-700">GetMerged - Find welcoming open source projects that actually merge PRs</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-500">
            <Link prefetch={false} href="/pricing" title="Pricing & Plans" className="hover:text-zinc-900 transition-colors">Pricing</Link>
            <Link prefetch={false} href="/privacy" title="Privacy Policy" className="hover:text-zinc-900 transition-colors">Privacy</Link>
            <Link prefetch={false} href="/terms" title="Terms of Service" className="hover:text-zinc-900 transition-colors">Terms</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" title="GitHub" className="hover:text-zinc-900 transition-colors">GitHub API</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
