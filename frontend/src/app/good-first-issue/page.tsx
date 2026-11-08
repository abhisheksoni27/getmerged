import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";
import { LanguageMatchQuiz } from "@/components/LanguageMatchQuiz";
import { GfiSniperCard } from "@/components/GfiSniperCard";

export const metadata: Metadata = {
  title: "Good First Issues: Repos Ranked by PR Merge Rate | GetMerged",
  description:
    "Find beginner Good First Issues across Python, TypeScript, Go, Rust, and Java ranked by maintainer review speed and merge rates.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/good-first-issue",
    types: {
      "application/atom+xml": "https://getmerged.abhishekco.de/good-first-issue/feed.xml",
    },
  },
  openGraph: {
    title: "Good First Issues: Repos Ranked by PR Merge Rate | GetMerged",
    description: "Find active beginner-friendly issues in GitHub repositories with high PR merge rates.",
    url: "https://getmerged.abhishekco.de/good-first-issue",
    siteName: "GetMerged",
  },
};

export default function GoodFirstIssueIndexPage() {
  const ecosystems = [
    { name: "Python", slug: "python", desc: "Beginner-friendly issues in Python web frameworks, machine learning, and automation tools.", count: "Active Issues" },
    { name: "TypeScript", slug: "typescript", desc: "Frontend and fullstack issues across Next.js, Node.js, and React developer libraries.", count: "Active Issues" },
    { name: "Go", slug: "go", desc: "Approachable starter issues in cloud tools, backend services, and CLI packages.", count: "Active Issues" },
    { name: "Rust", slug: "rust", desc: "First-timer labeled issues for systems programming and utility crates.", count: "Active Issues" },
    { name: "C#", slug: "csharp", desc: "Beginner tasks across .NET open-source libraries, desktop, and web apps.", count: "Active Issues" },
    { name: "C++", slug: "cpp", desc: "Open-source starter tasks in graphics, game tooling, and core infrastructure.", count: "Active Issues" },
    { name: "Java", slug: "java", desc: "Good first issues across Spring, enterprise frameworks, and Android projects.", count: "Active Issues" },
    { name: "PHP", slug: "php", desc: "Beginner-friendly issues in Laravel packages, Symfony components, and CMS tools.", count: "Active Issues" },
    { name: "Ruby", slug: "ruby", desc: "Starter tasks in Rails engines, developer gems, and Sinatra apps.", count: "Active Issues" },
    { name: "Swift", slug: "swift", desc: "Beginner issues in iOS utilities, macOS open-source apps, and Swift server packages.", count: "Active Issues" },
    { name: "Kotlin", slug: "kotlin", desc: "Starter issues across Android libraries and multiplatform Kotlin projects.", count: "Active Issues" },
    { name: "Dart", slug: "dart", desc: "Beginner issues in Flutter widgets, UI packages, and cross-platform tools.", count: "Active Issues" },
    { name: "Elixir", slug: "elixir", desc: "Approachable issues in Phoenix, Ecto, and distributed OTP open-source tools.", count: "Active Issues" },
    { name: "Zig", slug: "zig", desc: "Starter contributions for systems libraries and modern command-line tools.", count: "Active Issues" },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full font-sans">
        {/* Navigation Breadcrumb */}
        <Link
          prefetch={false}
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Section */}
        <div className="card card-highlight p-6 sm:p-8 mb-8">
          <div className="hero-badge">
            <span className="dot" />
            <span>CURATED CONTRIBUTOR QUEUE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight font-display mb-3">
            Good First Issues from Welcoming Repos
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Strictly capped at 2–3 issues per repository to prevent farmable spam. Only indexed from verified Tier S, A, and B maintainers with proven PR review turnaround.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="pill pill-green">✓ High PR Acceptance (&gt;75%)</span>
            <span className="pill pill-purple">✓ Median Review &lt; 24h</span>
            <span className="pill pill-amber">✓ No Stale Tickets</span>
          </div>
        </div>

        {/* Interactive Match & Sniper Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <LanguageMatchQuiz />
          <GfiSniperCard />
        </div>

        {/* Section Header */}
        <div className="mb-5 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--green-bright)]" />
            <span>Browse by Ecosystem ({ecosystems.length} stacks)</span>
          </h2>
          <span className="text-xs text-[var(--text-tertiary)] font-mono">Live Sync</span>
        </div>

        {/* Ecosystem Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {ecosystems.map((eco) => (
            <Link
              prefetch={false}
              key={eco.slug}
              href={`/good-first-issue/${eco.slug}`}
              className="card group hover:border-[var(--border-accent)] flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="h-9 w-9 rounded-md border border-[var(--border-subtle)] bg-[#0D111A] flex items-center justify-center shrink-0">
                    <LangLogo language={eco.name} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--purple-bright)] transition-colors">
                      {eco.name}
                    </h3>
                    <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                      /good-first-issue/{eco.slug}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                  {eco.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono font-medium text-[var(--purple-bright)]">
                <span>View tickets</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
