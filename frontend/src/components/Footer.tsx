"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Sparkles, Terminal, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import posthog from "posthog-js";

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
    <footer className="border-t border-[var(--border-subtle)] bg-[#04060A] text-[var(--text-secondary)] font-sans pt-14 pb-12 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Directory Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-xs">
          {/* Column 1: Ecosystem Rankings */}
          <div className="space-y-3">
            <h3 className="font-mono font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
              Ecosystems
            </h3>
            <ul className="space-y-2.5 font-sans text-xs text-[var(--text-secondary)]">
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
            <h3 className="font-mono font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
              More Ecosystems
            </h3>
            <ul className="space-y-2.5 font-sans text-xs text-[var(--text-secondary)]">
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
                  className="text-[var(--text-primary)] font-mono text-xs hover:text-[var(--purple-bright)] transition-colors inline-flex items-center gap-1"
                >
                  <span>Explore All Topics &rarr;</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Good First Issues */}
          <div className="space-y-3">
            <h3 className="font-mono font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
              Good First Issues
            </h3>
            <ul className="space-y-2.5 font-sans text-xs text-[var(--text-secondary)]">
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
                  className="text-[var(--text-primary)] font-mono text-xs hover:text-[var(--purple-bright)] transition-colors inline-flex items-center gap-1"
                >
                  <span>All Good First Issues &rarr;</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Curated Discovery Collections */}
          <div className="space-y-3">
            <h3 className="font-mono font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
              Discovery
            </h3>
            <ul className="space-y-2.5 font-sans text-xs text-[var(--text-secondary)]">
              <li>
                <Link prefetch={false} href="/stack" title="Scan Your package.json or requirements.txt for Welcoming Dependencies" className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5">
                  <Terminal className="h-3 w-3 text-[var(--purple-bright)]" />
                  Stack Scanner (/stack)
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/community-powerhouses" title="Open Source Repositories with 3+ Active Maintainers" className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-[var(--green-bright)]" />
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
            <h3 className="font-mono font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
              Platform
            </h3>
            <ul className="space-y-2.5 font-sans text-xs text-[var(--text-secondary)]">
              <li>
                <Link prefetch={false} href="/dashboard" title="Contributor PR Tracker & Watchlist" className="hover:text-[var(--text-primary)] transition-colors">
                  Contributor Dashboard
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/maintainers" title="Maintainer Claim Portal & PR Telemetry" className="text-[var(--text-primary)] hover:text-[var(--purple-bright)] transition-colors">
                  For Maintainers
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
            <ShieldCheck className="h-4 w-4 text-[var(--green-bright)]" />
            <span className="text-[var(--text-secondary)]">GetMerged · Empirical telemetry for open-source PR acceptance</span>
          </div>
          <div className="flex items-center gap-4 text-[var(--text-tertiary)]">
            <Link prefetch={false} href="/privacy" title="Privacy Policy" className="hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
            <Link prefetch={false} href="/terms" title="Terms of Service" className="hover:text-[var(--text-primary)] transition-colors">Terms</Link>
            <a
              href="https://github.com/abhisheksoni27/getmerged"
              target="_blank"
              rel="noopener noreferrer"
              title="Star GetMerged on GitHub"
              onClick={() => posthog.capture("github_star_clicked", { source: "footer" })}
              className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              <span>Star on GitHub</span>
              <Star className="h-3 w-3 text-[#E3B341] fill-[#E3B341]" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
