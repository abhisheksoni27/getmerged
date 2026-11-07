import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { Trophy, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";

export const metadata: Metadata = {
  title: "Top Open Source Repos Ranked by Contributor Friendliness (2026) | GetMerged",
  description: "Browse repository contributor-friendliness rankings by programming language and ecosystem. Find welcoming GitHub repos across Python, TypeScript, Go, Rust, C#, and more.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/rankings",
  },
  openGraph: {
    title: "Top Open Source Repos Ranked by Contributor Friendliness | GetMerged",
    description: "Explore top welcoming open-source repositories ranked by programming language and C-Rank™ telemetry.",
    url: "https://getmerged.abhishekco.de/rankings",
    siteName: "GetMerged",
  },
};

export default function RankingsIndexPage() {
  const ecosystems = [
    { name: "Python", slug: "python", desc: "Fast-merging data science, web, and AI open-source libraries.", tag: "AI & Data", count: "50+ Repos" },
    { name: "TypeScript", slug: "typescript", desc: "Top frontend and fullstack repositories with active maintainers.", tag: "Fullstack", count: "50+ Repos" },
    { name: "Go", slug: "go", desc: "Cloud-native, Kubernetes, and backend infrastructure tooling.", tag: "Cloud & Infra", count: "50+ Repos" },
    { name: "Rust", slug: "rust", desc: "High-performance systems programming and CLI utilities.", tag: "Systems", count: "50+ Repos" },
    { name: "Kotlin", slug: "kotlin", desc: "Android apps, Compose Multiplatform, and backend microservices.", tag: "Mobile & Backend", count: "50+ Repos" },
    { name: "Java", slug: "java", desc: "Distributed enterprise backends, Spring, and Android tools.", tag: "Enterprise", count: "50+ Repos" },
    { name: "C#", slug: "csharp", desc: "Modern .NET, game development, and enterprise applications.", tag: ".NET & Games", count: "50+ Repos" },
    { name: "C++", slug: "cpp", desc: "Game engines, graphics, and performance-critical systems.", tag: "Performance", count: "50+ Repos" },
    { name: "Swift", slug: "swift", desc: "iOS, macOS, and cross-platform Swift developer packages.", tag: "Apple & Mobile", count: "50+ Repos" },
    { name: "PHP", slug: "php", desc: "Modern PHP, Laravel, and Symfony open-source packages.", tag: "Web Frameworks", count: "50+ Repos" },
    { name: "Ruby", slug: "ruby", desc: "Ruby on Rails ecosystem, developer tools, and gems.", tag: "Rails & Web", count: "50+ Repos" },
    { name: "Dart", slug: "dart", desc: "Flutter mobile, desktop, and web component packages.", tag: "Cross-Platform", count: "50+ Repos" },
    { name: "Elixir", slug: "elixir", desc: "Phoenix framework, distributed computing, and OTP apps.", tag: "Concurrency", count: "40+ Repos" },
    { name: "Zig", slug: "zig", desc: "Next-generation systems software and lightweight tooling.", tag: "Systems", count: "30+ Repos" },
  ];

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Open Source Ecosystem Rankings (C-Rank™)",
    description: "Directory of open-source repository rankings across major programming languages based on PR telemetry.",
    url: "https://getmerged.abhishekco.de/rankings",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://getmerged.abhishekco.de",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Ecosystem Rankings",
        item: "https://getmerged.abhishekco.de/rankings",
      },
    ],
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 w-full text-[var(--text-primary)] font-sans">
        <Link prefetch={false}
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors mb-5 font-sans shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Section */}
        <div className="rounded-3xl bg-[var(--bg-surface)] p-6 sm:p-10 border border-[var(--border-subtle)] shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#C4910A]/10 border border-[#C4910A]/30 px-3 py-1 text-xs font-semibold text-[#C4910A] font-mono shadow-xs">
              <Trophy className="h-3.5 w-3.5 text-[#C4910A]" /> Ecosystem Directory
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight font-display">
            Open Source Ecosystem Rankings
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed font-sans">
            Benchmark welcoming repositories grouped by language ecosystem. Each ecosystem is scored from public GitHub PR merge history, maintainer turnaround velocity, and first-timer acceptance rates.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs font-mono text-[var(--text-tertiary)]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#0D9668]" />
            <span>Updated daily with real GitHub activity</span>
          </div>
        </div>

        {/* Directory Section Header */}
        <div className="mb-6 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-display">
            <ShieldCheck className="h-4 w-4 text-[#0D9668]" />
            Browse by Ecosystem ({ecosystems.length})
          </h2>
          <span className="text-xs text-[var(--text-tertiary)] font-mono hidden sm:inline">Active &amp; Welcoming Projects</span>
        </div>

        {/* Ecosystem Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {ecosystems.map((eco) => (
            <Link prefetch={false}
              key={eco.slug}
              href={`/rankings/${eco.slug}`}
              title={`View Top Welcoming ${eco.name} Open Source Repositories`}
              className="group rounded-2xl bg-[var(--bg-surface)] p-6 sm:p-7 border border-[var(--border-subtle)] shadow-sm hover:border-[var(--border-hover)] hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-center shrink-0 shadow-2xs">
                      <LangLogo language={eco.name} />
                    </div>
                    <div>
                      <h3 className="font-display text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                        {eco.name}
                      </h3>
                      <span className="text-xs font-mono text-[var(--text-tertiary)]">/rankings/{eco.slug}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-2.5 py-0.5 rounded-md border border-[var(--border-subtle)]">
                    {eco.tag}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans mt-2">
                  {eco.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono font-semibold text-[var(--color-primary)]">
                <span className="text-xs text-[var(--text-tertiary)] font-normal">{eco.count}</span>
                <div className="flex items-center gap-1">
                  <span>View Rankings</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
