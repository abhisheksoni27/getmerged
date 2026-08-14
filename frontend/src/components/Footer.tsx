"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Code2, Activity } from "lucide-react";

export function Footer() {
  const topLanguages = [
    { name: "Go", slug: "go" },
    { name: "TypeScript", slug: "typescript" },
    { name: "Python", slug: "python" },
    { name: "Rust", slug: "rust" },
    { name: "Java", slug: "java" },
    { name: "C++", slug: "cpp" },
    { name: "PHP", slug: "php" },
    { name: "Kotlin", slug: "kotlin" },
    { name: "Swift", slug: "swift" },
    { name: "JavaScript", slug: "javascript" },
  ];

  return (
    <footer className="border-t-2 border-brand-dark bg-zinc-950 text-zinc-400 font-sans pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-zinc-800/80 font-mono text-xs">
          {/* Column 1: Brand & Tagline */}
          <div className="col-span-2 space-y-4 font-sans pr-4">
            <Link href="/" title="opendoor - Glassdoor for Open Source Repositories" className="flex items-center gap-2.5">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-brand-cream border-2 border-brand-dark font-space font-extrabold text-zinc-950 text-xs shadow-[1px_1px_0px_#222831]">
                OD
              </div>
              <span className="font-space text-base font-extrabold text-white tracking-tight">opendoor</span>
            </Link>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-sm">
              Glassdoor for open-source repositories. Opendoor scores public GitHub repositories using a proprietary <strong>C-Rank™</strong> system (S to D) based on merge rates, response times, and first-timer success metrics.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400 font-mono">
              <ShieldCheck className="h-4 w-4" /> 100% Objective GitHub Telemetry Data
            </div>
          </div>

          {/* Column 2: Ecosystem Rankings */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider font-space">Ecosystem Rankings</h4>
            <ul className="space-y-2 text-zinc-400 font-mono text-[11px]">
              {topLanguages.slice(0, 5).map((lang) => (
                <li key={lang.slug}>
                  <Link
                    href={`/rankings/${lang.slug}`}
                    title={`Top Welcoming ${lang.name} Open Source Repositories`}
                    className="hover:text-emerald-400 transition-colors"
                  >
                    Top {lang.name} Repos
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Good First Issues */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider font-space">Good First Issues</h4>
            <ul className="space-y-2 text-zinc-400 font-mono text-[11px]">
              {topLanguages.slice(0, 5).map((lang) => (
                <li key={lang.slug}>
                  <Link
                    href={`/good-first-issue/${lang.slug}`}
                    title={`Beginner Friendly Good First Issues in ${lang.name}`}
                    className="hover:text-emerald-400 transition-colors"
                  >
                    {lang.name} Good First Issues
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Platform & Developers */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider font-space">Platform</h4>
            <ul className="space-y-2 text-zinc-400 font-mono text-[11px]">
              <li>
                <Link href="/status" title="Opendoor Service & Pipeline Uptime Status" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <Activity className="h-3 w-3 text-emerald-500" /> System Status
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/abhisheksoni27/opendoor"
                  target="_blank"
                  rel="noreferrer"
                  title="View opendoor on GitHub — open source contribution welcome"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <Code2 className="h-3 w-3" /> GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/abhisheksoni27/opendoor/pulls"
                  target="_blank"
                  rel="noreferrer"
                  title="Open pull requests on the opendoor GitHub repository"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Open Pull Requests
                </a>
              </li>
              <li>
                <a href="/api/v1/health" target="_blank" title="Check Opendoor API health status" className="hover:text-emerald-400 transition-colors">
                  API Health
                </a>
              </li>
              <li>
                <Link href="/privacy" title="Opendoor Privacy Policy" className="hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" title="Opendoor Terms of Service" className="hover:text-emerald-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div>
            © {new Date().getFullYear()} opendoor - Glassdoor for Open Source Repositories. Built with ❤️ for open-source contributors.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" title="Opendoor Open Source Explorer Home" className="hover:text-zinc-300">Home</Link>
            <Link href="/status" title="System Status" className="hover:text-zinc-300">Status</Link>
            <Link href="/privacy" title="Privacy Policy" className="hover:text-zinc-300">Privacy</Link>
            <Link href="/terms" title="Terms of Service" className="hover:text-zinc-300">Terms</Link>
            <a href="https://github.com/abhisheksoni27/opendoor" target="_blank" rel="noreferrer" title="opendoor on GitHub" className="hover:text-zinc-300">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
