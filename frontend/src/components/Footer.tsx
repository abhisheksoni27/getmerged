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
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] font-sans pt-16 pb-12 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Directory Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-xs">
          {/* Column 1: Ecosystem Rankings */}
          <div className="space-y-3">
            <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider font-mono">
              Ecosystems
            </h3>
            <ul className="space-y-2.5 font-mono text-xs text-[var(--text-secondary)]">
              {rankingLangs.slice(0, 7).map((lang) => (
                <li key={`rank-${lang.slug}`}>
                  <Link
                    href={`/rankings/${lang.slug}`}
                    prefetch={false}
                    title={`Top Welcoming ${lang.name} Open Source Repositories`}
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    {`Top ${lang.name} Repos`}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: More Ecosystems & Topics */}
          <div className="space-y-3">
            <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider font-mono">
              More Ecosystems
            </h3>
            <ul className="space-y-2.5 font-mono text-xs text-[var(--text-secondary)]">
              {rankingLangs.slice(7).map((lang) => (
                <li key={`rank-more-${lang.slug}`}>
                  <Link
                    href={`/rankings/${lang.slug}`}
                    prefetch={false}
                    title={`Top Welcoming ${lang.name} Open Source Repositories`}
                    className="hover:text-[var(--text-primary)] transition-colors"
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
                  className="text-[var(--color-primary)] hover:underline font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Explore All Topics &rarr;</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Good First Issues */}
          <div className="space-y-3">
            <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider font-mono">
              Good First Issues
            </h3>
            <ul className="space-y-2.5 font-mono text-xs text-[var(--text-secondary)]">
              {rankingLangs.slice(0, 6).map((lang) => (
                <li key={`gfi-${lang.slug}`}>
                  <Link
                    href={`/good-first-issue/${lang.slug}`}
                    prefetch={false}
                    title={`Beginner Friendly Good First Issues in ${lang.name}`}
                    className="hover:text-[var(--text-primary)] transition-colors"
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
                  className="text-[#0D9668] hover:underline font-semibold transition-colors flex items-center gap-1"
                >
                  <span>All Good First Issues &rarr;</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Curated Discovery Collections */}
          <div className="space-y-3">
            <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider font-mono">
              Discovery
            </h3>
            <ul className="space-y-2.5 font-mono text-xs text-[var(--text-secondary)]">
              <li>
                <Link prefetch={false} href="/league" title="Monthly Open-Source Contributor League & Active Sprints" className="text-[var(--color-primary)] hover:underline font-semibold transition-colors flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  Monthly League Sprint
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/community-powerhouses" title="Open Source Repositories with 3+ Active Maintainers" className="text-[#2D8ABF] hover:underline transition-colors flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[#2D8ABF]" />
                  Community Powerhouses
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/hall-of-fame" title="S-Tier Welcoming Hall of Fame Repositories" className="hover:text-[var(--text-primary)] transition-colors">
                  Hall of Fame (S-Tier)
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/leaderboard" title="Fastest PR Review Turnaround Leaderboard" className="hover:text-[var(--text-primary)] transition-colors">
                  Review Velocity Board
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/repos" title="Complete Directory of Scored GitHub Repositories" className="hover:text-[var(--text-primary)] transition-colors">
                  Repository Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Platform & Methodology */}
          <div className="space-y-3">
            <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider font-mono">
              Platform
            </h3>
            <ul className="space-y-2.5 font-mono text-xs text-[var(--text-secondary)]">
              <li>
                <Link prefetch={false} href="/pricing" title="Pro Contributor, Recruiter Pass & Maintainer Plans" className="text-[var(--text-primary)] font-semibold hover:text-[#0D9668] transition-colors">
                  Pricing & Plans 💳
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/dashboard" title="Contributor PR Tracker, Quests & Reputation" className="hover:text-[var(--text-primary)] transition-colors">
                  Contributor Dashboard
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/maintainers" title="Maintainer Claim Portal & PR Telemetry" className="text-[#0D9668] hover:underline font-semibold transition-colors">
                  For Maintainers ⚡
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/stack" title="Find Good First Issues in Your Dependencies" className="text-[#0D9668] hover:underline transition-colors">
                  Stalk My Stack
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/how-c-rank-works" title="How C-Rank Works - Scoring Algorithm and Methodology" className="hover:text-[var(--text-primary)] transition-colors">
                  How C-Rank Works
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/compare" title="Compare GitHub Repositories Side-by-Side" className="hover:text-[var(--text-primary)] transition-colors">
                  Compare Repositories
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/guides" title="Open Source Contribution Best Practices & Playbooks" className="hover:text-[var(--text-primary)] transition-colors">
                  Contribution Guides
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/about" title="About GetMerged" className="hover:text-[var(--text-primary)] transition-colors">
                  About GetMerged
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/status" title="System Status & Live Indexing" className="hover:text-[var(--text-primary)] transition-colors">
                  System Status
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Metadata Bar */}
        <div className="border-t border-[var(--border-subtle)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[var(--text-tertiary)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#0D9668]" />
            <span className="text-[var(--text-secondary)]">GetMerged - Find welcoming open source projects that actually merge PRs</span>
          </div>
          <div className="flex items-center gap-4 text-[var(--text-secondary)]">
            <Link prefetch={false} href="/pricing" title="Pricing & Plans" className="hover:text-[var(--text-primary)] font-semibold transition-colors">Pricing</Link>
            <Link prefetch={false} href="/privacy" title="Privacy Policy" className="hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
            <Link prefetch={false} href="/terms" title="Terms of Service" className="hover:text-[var(--text-primary)] transition-colors">Terms</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" title="GitHub" className="hover:text-[var(--text-primary)] transition-colors">GitHub API</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
