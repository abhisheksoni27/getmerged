"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

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
    <footer className="border-t border-white/[0.08] bg-[#0a0a0a] text-[#a3a3a3] font-sans pt-16 pb-12 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Directory Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
          {/* Column 1: Ecosystem Rankings */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#d4d4d4] text-xs uppercase tracking-wider font-mono">
              Ecosystem Rankings
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

          {/* Column 2: More Ecosystems */}
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
            </ul>
          </div>

          {/* Column 3: Good First Issues */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#d4d4d4] text-xs uppercase tracking-wider font-mono">
              Good First Issues
            </h4>
            <ul className="space-y-2 font-mono text-[11px] text-[#a3a3a3]">
              {rankingLangs.slice(0, 7).map((lang) => (
                <li key={`gfi-${lang.slug}`}>
                  <Link
                    href={`/good-first-issue/${lang.slug}`}
                    prefetch={false}
                    title={`Beginner Friendly Good First Issues in ${lang.name}`}
                    className="hover:text-[#d4d4d4] transition-colors"
                  >
                    {`${lang.name} Good First Issues`}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Platform & Scoring */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#d4d4d4] text-xs uppercase tracking-wider font-mono">
              Platform
            </h4>
            <ul className="space-y-2 font-mono text-[11px] text-[#a3a3a3]">
              <li>
                <Link href="/repos" title="Directory of Scored GitHub Repositories" className="hover:text-[#d4d4d4] transition-colors">
                  All Repositories
                </Link>
              </li>
              <li>
                <Link href="/how-c-rank-works" title="How C-Rank Works - Scoring Algorithm and Methodology" className="hover:text-[#d4d4d4] transition-colors">
                  How C-Rank Works
                </Link>
              </li>
              <li>
                <Link href="/compare" title="Compare GitHub Repositories by Merge Rate" className="hover:text-[#d4d4d4] transition-colors">
                  Compare Repositories
                </Link>
              </li>
              <li>
                <Link href="/guides" title="Open Source Contribution Best Practices" className="hover:text-[#d4d4d4] transition-colors">
                  Contribution Guides
                </Link>
              </li>
              <li>
                <Link href="/hacktoberfest" title="Hacktoberfest 2026 Live Hub" className="text-[#ff6b00] hover:text-[#ff8a33] transition-colors">
                  Hacktoberfest Hub
                </Link>
              </li>
              <li>
                <Link href="/status" title="System Status & Live Indexing Telemetry" className="hover:text-[#d4d4d4] transition-colors">
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
            <span>GetMerged - Precision Diagnostic Telemetry</span>
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
