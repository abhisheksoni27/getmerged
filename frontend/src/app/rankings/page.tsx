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
    <div className="relative min-h-screen flex flex-col bg-black dev-grid-pattern">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 w-full text-zinc-200 font-sans">
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel border border-white/[0.1] text-xs text-zinc-300 hover:text-white transition-colors mb-5 font-sans shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Section */}
        <div className="rounded-3xl glass-panel p-6 sm:p-10 border border-white/[0.1] shadow-xs mb-8 border-b border-white/[0.1]">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-xl glass-card px-3 py-1 text-xs font-semibold text-white font-mono shadow-xs">
              <Trophy className="h-3.5 w-3.5 text-amber-400" /> Ecosystem Directory
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-space">
            Open Source Ecosystem Rankings
          </h1>
          <p className="mt-2.5 text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed font-sans">
            Benchmark welcoming repositories grouped by language ecosystem. Each ecosystem is scored from public GitHub PR merge history, maintainer turnaround velocity, and first-timer acceptance rates.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-zinc-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Telemetry updated daily via GitHub GraphQL</span>
          </div>
        </div>

        {/* Directory Section Header */}
        <div className="mb-6 flex items-center justify-between border-b border-white/[0.1] pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2 font-space">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Browse by Ecosystem ({ecosystems.length})
          </h2>
          <span className="text-[11px] text-zinc-300 font-mono hidden sm:inline">C-Rank™ Welcoming Telemetry</span>
        </div>

        {/* Ecosystem Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {ecosystems.map((eco) => (
            <Link
              key={eco.slug}
              href={`/rankings/${eco.slug}`}
              title={`View Top Welcoming ${eco.name} Open Source Repositories`}
              className="group rounded-2xl glass-panel p-5 sm:p-6 border border-white/[0.1] shadow-xs hover:border-white/[0.12] hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between border-b border-white/[0.1] cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl border border-white/[0.1] glass-card flex items-center justify-center shrink-0 shadow-2xs">
                      <LangLogo language={eco.name} />
                    </div>
                    <div>
                      <h3 className="font-space text-base sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {eco.name}
                      </h3>
                      <span className="text-[11px] font-mono text-zinc-300">/rankings/{eco.slug}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold glass-card text-zinc-300 px-2 py-0.5 rounded-md border border-white/[0.1]">
                    {eco.tag}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans mt-2">
                  {eco.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-white/[0.1] flex items-center justify-between text-xs font-mono font-semibold text-white group-hover:text-emerald-400">
                <span className="text-[11px] text-zinc-300 font-normal">{eco.count}</span>
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
