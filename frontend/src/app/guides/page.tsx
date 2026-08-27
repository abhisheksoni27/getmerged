import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { getAllGuides } from "@/lib/guides";
import { BookOpen, ArrowRight, ArrowLeft, Clock, ShieldCheck, Sparkles } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Open Source Contribution Guides & PR Telemetry | GetMerged",
  description:
    "Data-driven guides on finding open source projects that actually merge PRs, avoiding zombie codebases, and beginner repository playbooks.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/guides",
  },
  openGraph: {
    title: "Open Source Contribution Guides & PR Telemetry | GetMerged",
    description:
      "Data-driven developer guides for open source contribution, maintainer response velocity, and pull request etiquette.",
    url: "https://getmerged.abhishekco.de/guides",
    siteName: "GetMerged",
  },
};

export default function GuidesHubPage() {
  const guides = getAllGuides();

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Open Source Contribution Guides",
    description: "Data-driven developer guides for open source contribution and pull request telemetry.",
    url: "https://getmerged.abhishekco.de/guides",
    publisher: {
      "@type": "Organization",
      name: "GetMerged",
      url: "https://getmerged.abhishekco.de",
    },
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
        name: "Guides",
        item: "https://getmerged.abhishekco.de/guides",
      },
    ],
  };

  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-zinc-950 text-white font-sans">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 border border-white/[0.12] text-xs text-zinc-200 hover:text-white hover:bg-slate-800 rounded transition-colors mb-6 font-semibold shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Banner */}
        <div className="border border-white/[0.08] bg-zinc-900/80 p-8 sm:p-10 rounded-md border-t-2 border-t-slate-700 shadow-sm mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded font-mono text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Empirical Developer Guides &middot; Zero Speculation
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-sans text-white mb-4">
            Open Source Contribution Playbooks
          </h1>
          <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-3xl">
            Stop guessing whether maintainers will review your pull requests. Our engineering guides use real GitHub GraphQL telemetry from 53,000+ indexed repositories to help you pick responsive targets and get your code merged into main.
          </p>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              title={`Read guide: ${guide.title}`}
              className="border border-white/[0.08] bg-zinc-900/80 p-6 rounded-md border-t-2 border-t-slate-700 shadow-sm hover:border-slate-500 hover:scale-[1.01] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-950/80 border border-amber-700 text-amber-300 rounded font-mono text-xs font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" /> {guide.section}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs text-zinc-300">
                    <Clock className="w-3.5 h-3.5" /> {guide.readingTime}
                  </span>
                </div>

                <div className="mb-4 overflow-hidden rounded border border-white/[0.08] bg-slate-800 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/guides/${guide.slug}.jpg`}
                    alt={guide.title}
                    width={600}
                    height={315}
                    className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <h2 className="text-xl font-bold font-sans tracking-tight text-white mb-2.5 leading-snug">
                  {guide.title}
                </h2>
                <p className="text-sm text-zinc-300 font-sans leading-relaxed mb-6 line-clamp-2">
                  {guide.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-300">
                  By {guide.author} &middot; {guide.lastUpdated}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-orange-400 hover:text-orange-300">
                  Read Guide <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* C-Rank Extractable Definition Box */}
        <div className="border border-white/[0.08] bg-zinc-900/80 text-white p-6 sm:p-8 rounded-md border-t-2 border-t-orange-500 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            Empirical C-Rank Benchmark Standard
          </div>
          <h3 className="text-xl font-bold font-sans text-white mb-2">
            How OpenDoor Benchmarks Repository Openness
          </h3>
          <p className="text-zinc-300 text-sm leading-relaxed">
            Every repository in these guides is continuously audited across PR turnaround latency, first-time contributor conversion rates, maintainer bus factor, and external PR merge velocity.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
