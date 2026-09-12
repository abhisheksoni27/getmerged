import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { Sprout, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";
import { LanguageMatchQuiz } from "@/components/LanguageMatchQuiz";
import { GfiSniperCard } from "@/components/GfiSniperCard";

export const metadata: Metadata = {
  title: "Good First Issues: Repos Ranked by PR Merge Rate | GetMerged",
  description: "Find beginner Good First Issues across Python, TypeScript, Go, Rust, and Java ranked by maintainer review speed and merge rates.",
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
    { name: "Python", slug: "python", desc: "Beginner-friendly issues in Python web frameworks, machine learning, and automation tools." },
    { name: "TypeScript", slug: "typescript", desc: "Frontend and fullstack issues across Next.js, Node.js, and React developer libraries." },
    { name: "Go", slug: "go", desc: "Approachable starter issues in cloud tools, backend services, and CLI packages." },
    { name: "Rust", slug: "rust", desc: "First-timer labeled issues for systems programming and utility crates." },
    { name: "C#", slug: "csharp", desc: "Beginner tasks across .NET open-source libraries, desktop, and web apps." },
    { name: "C++", slug: "cpp", desc: "Open-source starter tasks in graphics, game tooling, and core infrastructure." },
    { name: "Java", slug: "java", desc: "Good first issues across Spring, enterprise frameworks, and Android projects." },
    { name: "PHP", slug: "php", desc: "Beginner-friendly issues in Laravel packages, Symfony components, and CMS tools." },
    { name: "Ruby", slug: "ruby", desc: "Starter tasks in Rails engines, developer gems, and Sinatra apps." },
    { name: "Swift", slug: "swift", desc: "Beginner issues in iOS utilities, macOS open-source apps, and Swift server packages." },
    { name: "Kotlin", slug: "kotlin", desc: "Starter issues across Android libraries and multiplatform Kotlin projects." },
    { name: "Dart", slug: "dart", desc: "Beginner issues in Flutter widgets, UI packages, and cross-platform tools." },
    { name: "Elixir", slug: "elixir", desc: "Approachable issues in Phoenix, Ecto, and distributed OTP open-source tools." },
    { name: "Zig", slug: "zig", desc: "Starter contributions for systems libraries and modern command-line tools." },
  ];

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Good First Issues by Programming Language",
    description: "Directory of beginner-friendly Good First Issues across open-source ecosystems with active maintainer reviews.",
    url: "https://getmerged.abhishekco.de/good-first-issue",
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Good First Issues Programming Ecosystems",
    itemListElement: ecosystems.map((eco, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: `${eco.name} Good First Issues`,
      url: `https://getmerged.abhishekco.de/good-first-issue/${eco.slug}`,
    })),
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
        name: "Good First Issues",
        item: "https://getmerged.abhishekco.de/good-first-issue",
      },
    ],
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent dev-grid-pattern">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full text-zinc-200 font-sans">
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel border border-white/[0.1] text-xs text-zinc-300 hover:text-white transition-colors mb-6 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        <div className="rounded-3xl glass-panel p-6 sm:p-10 border border-white/[0.1] shadow-xs mb-10">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-300 font-mono">
              <Sprout className="h-3.5 w-3.5 text-emerald-400" /> Beginner Contributor Hub
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-space">
            Good First Issues by Stack
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed font-sans">
            Find welcoming repositories with labeled beginner issues, fast maintainer review response times, and high first-timer pull request success rates.
          </p>
        </div>

        <LanguageMatchQuiz />

        <div className="mt-8 mb-8">
          <GfiSniperCard />
        </div>

        <div className="mb-6 mt-12 flex items-center justify-between border-b border-white/[0.1] pb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 font-space">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Ecosystems with Beginner Issues ({ecosystems.length})
          </h2>
          <span className="text-xs text-zinc-300 font-mono">Live Issues Directory</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {ecosystems.map((eco) => (
            <Link
              key={eco.slug}
              href={`/good-first-issue/${eco.slug}`}
              title={`View ${eco.name} Good First Issues and beginner tickets`}
              className="group rounded-2xl glass-panel p-6 border border-white/[0.1] shadow-xs hover:border-white/[0.12] hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl border border-white/[0.1] glass-card flex items-center justify-center shrink-0">
                    <LangLogo language={eco.name} />
                  </div>
                  <div>
                    <h3 className="font-space text-lg font-bold text-white group-hover:text-zinc-300 transition-colors">
                      {eco.name}
                    </h3>
                    <span className="text-[11px] font-mono text-zinc-300">/good-first-issue/{eco.slug}</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {eco.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-white/[0.1] flex items-center justify-between text-xs font-mono font-semibold text-white group-hover:text-zinc-300">
                <span>Browse beginner issues</span>
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
