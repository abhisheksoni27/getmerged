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
    <footer className="border-t border-white/[0.08] bg-transparent text-[#a3a3a3] font-sans pt-16 pb-12 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Directory Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-xs">
          {/* Column 1: Ecosystem Rankings */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#d4d4d4] text-xs uppercase tracking-wider font-mono">
              Ecosystems
            </h4>
            <ul className="space-y-2 font-mono text-[11px] text-[#a3a3a3]">
              {rankingLangs.slice(0, 7).map((lang) => (
                <li key={`rank-${lang.slug}`}>
                  <Link
                    href={`/rankings/${lang.slug}`}
                    prefetch={false}
                    title={`Top Welcoming ${lang.name} Open Source Repositories`}
                    className="hover:text-[#d4d4d4] transition-colors"
                  >
                    {`Top ${lang.name} Repos`}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: More Ecosystems & Topics */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#d4d4d4] text-xs uppercase tracking-wider font-mono">
              More Ecosystems
            </h4>
            <ul className="space-y-2 font-mono text-[11px] text-[#a3a3a3]">
              {rankingLangs.slice(7).map((lang) => (
                <li key={`rank-more-${lang.slug}`}>
                  <Link
                    href={`/rankings/${lang.slug}`}
                    prefetch={false}
                    title={`Top Welcoming ${lang.name} Open Source Repositories`}
                    className="hover:text-[#d4d4d4] transition-colors"
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
                  className="text-white hover:text-[#ff8a33] font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Explore All Topics &rarr;</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Good First Issues */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#d4d4d4] text-xs uppercase tracking-wider font-mono">
              Good First Issues
            </h4>
            <ul className="space-y-2 font-mono text-[11px] text-[#a3a3a3]">
              {rankingLangs.slice(0, 6).map((lang) => (
                <li key={`gfi-${lang.slug}`}>
                  <Link
                    href={`/good-first-issue/${lang.slug}`}
                    prefetch={false}
                    title={`Beginner Friendly Good First Issues in ${lang.name}`}
                    className="hover:text-[#d4d4d4] transition-colors"
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
                  className="text-white hover:text-[#ff8a33] font-semibold transition-colors flex items-center gap-1"
                >
                  <span>All Good First Issues &rarr;</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Curated Discovery Collections */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#d4d4d4] text-xs uppercase tracking-wider font-mono">
              Discovery
            </h4>
            <ul className="space-y-2 font-mono text-[11px] text-[#a3a3a3]">
              <li>
                <Link href="/league" title="Monthly Open-Source Contributor League & Active Sprints" className="text-[#ff6b00] hover:text-[#ff8a33] font-semibold transition-colors flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  Monthly League Sprint
                </Link>
              </li>
              <li>
                <Link href="/community-powerhouses" title="Open Source Repositories with 3+ Active Maintainers" className="hover:text-white transition-colors flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  Community Powerhouses
                </Link>
              </li>
              <li>
                <Link href="/hall-of-fame" title="S-Tier Welcoming Hall of Fame Repositories" className="hover:text-[#d4d4d4] transition-colors">
                  Hall of Fame (S-Tier)
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" title="Fastest PR Review Turnaround Leaderboard" className="hover:text-[#d4d4d4] transition-colors">
                  Review Velocity Board
                </Link>
              </li>
              <li>
                <Link href="/repos" title="Complete Directory of Scored GitHub Repositories" className="hover:text-[#d4d4d4] transition-colors">
                  Repository Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Platform & Methodology */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#d4d4d4] text-xs uppercase tracking-wider font-mono">
              Platform
            </h4>
            <ul className="space-y-2 font-mono text-[11px] text-[#a3a3a3]">
              <li>
                <Link href="/how-c-rank-works" title="How C-Rank Works - Scoring Algorithm and Methodology" className="hover:text-[#d4d4d4] transition-colors">
                  How C-Rank Works
                </Link>
              </li>
              <li>
                <Link href="/compare" title="Compare GitHub Repositories Side-by-Side" className="hover:text-[#d4d4d4] transition-colors">
                  Compare Repositories
                </Link>
              </li>
              <li>
                <Link href="/guides" title="Open Source Contribution Best Practices & Playbooks" className="hover:text-[#d4d4d4] transition-colors">
                  Contribution Guides
                </Link>
              </li>
              <li>
                <Link href="/about" title="About GetMerged" className="hover:text-[#d4d4d4] transition-colors">
                  About GetMerged
                </Link>
              </li>
              <li>
                <Link href="/status" title="System Status & Live Indexing" className="hover:text-[#d4d4d4] transition-colors">
                  System Status
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Metadata Bar */}
        <div className="border-t border-white/[0.08] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#737373]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#10b981]" />
            <span>GetMerged - Find welcoming open source projects that actually merge PRs</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" title="Privacy Policy" className="hover:text-[#a3a3a3] transition-colors">Privacy</Link>
            <Link href="/terms" title="Terms of Service" className="hover:text-[#a3a3a3] transition-colors">Terms</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" title="GitHub" className="hover:text-[#a3a3a3] transition-colors">GitHub API</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
