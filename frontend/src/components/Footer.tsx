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
    <footer className="border-t-4 border-black bg-[#FFFDF8] text-black font-mono pt-16 pb-12 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Directory Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-xs">
          {/* Column 1: Ecosystem Rankings */}
          <div className="space-y-3">
            <h3 className="font-black text-black text-xs uppercase tracking-wider font-mono border-b-2 border-black pb-1 inline-block">
              Ecosystems
            </h3>
            <ul className="space-y-2.5 font-mono text-xs text-neutral-700">
              {rankingLangs.slice(0, 7).map((lang) => (
                <li key={`rank-${lang.slug}`}>
                  <Link
                    href={`/rankings/${lang.slug}`}
                    prefetch={false}
                    title={`Top Welcoming ${lang.name} Open Source Repositories`}
                    className="hover:text-black hover:font-bold transition-none"
                  >
                    {`Top ${lang.name} Repos`}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: More Ecosystems & Topics */}
          <div className="space-y-3">
            <h3 className="font-black text-black text-xs uppercase tracking-wider font-mono border-b-2 border-black pb-1 inline-block">
              More Ecosystems
            </h3>
            <ul className="space-y-2.5 font-mono text-xs text-neutral-700">
              {rankingLangs.slice(7).map((lang) => (
                <li key={`rank-more-${lang.slug}`}>
                  <Link
                    href={`/rankings/${lang.slug}`}
                    prefetch={false}
                    title={`Top Welcoming ${lang.name} Open Source Repositories`}
                    className="hover:text-black hover:font-bold transition-none"
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
                  className="text-black font-black hover:bg-[#FACC15] inline-block px-1 border border-black transition-none"
                >
                  <span>Explore All Topics &rarr;</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Good First Issues */}
          <div className="space-y-3">
            <h3 className="font-black text-black text-xs uppercase tracking-wider font-mono border-b-2 border-black pb-1 inline-block">
              Good First Issues
            </h3>
            <ul className="space-y-2.5 font-mono text-xs text-neutral-700">
              {rankingLangs.slice(0, 6).map((lang) => (
                <li key={`gfi-${lang.slug}`}>
                  <Link
                    href={`/good-first-issue/${lang.slug}`}
                    prefetch={false}
                    title={`Beginner Friendly Good First Issues in ${lang.name}`}
                    className="hover:text-black hover:font-bold transition-none"
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
                  className="text-black font-black hover:bg-[#10B981] inline-block px-1 border border-black transition-none"
                >
                  <span>All Good First Issues &rarr;</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Curated Discovery Collections */}
          <div className="space-y-3">
            <h3 className="font-black text-black text-xs uppercase tracking-wider font-mono border-b-2 border-black pb-1 inline-block">
              Discovery
            </h3>
            <ul className="space-y-2.5 font-mono text-xs text-neutral-700">
              <li>
                <Link prefetch={false} href="/league" title="Monthly Open-Source Contributor League & Active Sprints" className="text-black hover:font-bold transition-none flex items-center gap-1">
                  <Flame className="h-3 w-3 fill-[#FACC15] text-black" />
                  Monthly League Sprint
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/community-powerhouses" title="Open Source Repositories with 3+ Active Maintainers" className="text-black hover:font-bold transition-none flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-black" />
                  Community Powerhouses
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/hall-of-fame" title="S-Tier Welcoming Hall of Fame Repositories" className="hover:text-black hover:font-bold transition-none">
                  Hall of Fame (S-Tier)
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/leaderboard" title="Fastest PR Review Turnaround Leaderboard" className="hover:text-black hover:font-bold transition-none">
                  Review Velocity Board
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/repos" title="Complete Directory of Scored GitHub Repositories" className="hover:text-black hover:font-bold transition-none">
                  Repository Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Platform & Methodology */}
          <div className="space-y-3">
            <h3 className="font-black text-black text-xs uppercase tracking-wider font-mono border-b-2 border-black pb-1 inline-block">
              Platform
            </h3>
            <ul className="space-y-2.5 font-mono text-xs text-neutral-700">
              <li>
                <Link prefetch={false} href="/pricing" title="Pro Contributor, Recruiter Pass & Maintainer Plans" className="text-black font-black hover:bg-[#FACC15] inline-block px-1 border border-black transition-none">
                  Pricing & Plans 💳
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/dashboard" title="Contributor PR Tracker, Quests & Reputation" className="hover:text-black hover:font-bold transition-none">
                  Contributor Dashboard
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/maintainers" title="Maintainer Claim Portal & PR Telemetry" className="text-black font-black hover:bg-[#10B981] inline-block px-1 border border-black transition-none">
                  For Maintainers ⚡
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/stack" title="Find Good First Issues in Your Dependencies" className="hover:text-black hover:font-bold transition-none">
                  Stalk My Stack
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/how-c-rank-works" title="How C-Rank Works - Scoring Algorithm and Methodology" className="hover:text-black hover:font-bold transition-none">
                  How C-Rank Works
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/compare" title="Compare GitHub Repositories Side-by-Side" className="hover:text-black hover:font-bold transition-none">
                  Compare Repositories
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/guides" title="Open Source Contribution Best Practices & Playbooks" className="hover:text-black hover:font-bold transition-none">
                  Contribution Guides
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/about" title="About GetMerged" className="hover:text-black hover:font-bold transition-none">
                  About GetMerged
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/status" title="System Status & Live Indexing" className="hover:text-black hover:font-bold transition-none">
                  System Status
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Metadata Bar */}
        <div className="border-t-2 border-black pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-black">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-black" />
            <span className="font-bold">GetMerged // Find welcoming open source projects that actually merge PRs</span>
          </div>
          <div className="flex items-center gap-4 text-black font-bold">
            <Link prefetch={false} href="/pricing" title="Pricing & Plans" className="hover:bg-[#FACC15] px-1 border border-black">Pricing</Link>
            <Link prefetch={false} href="/privacy" title="Privacy Policy" className="hover:underline">Privacy</Link>
            <Link prefetch={false} href="/terms" title="Terms of Service" className="hover:underline">Terms</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" title="GitHub" className="hover:underline">GitHub API</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
