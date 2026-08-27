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
    <div className="min-h-screen flex flex-col bg-[#FCFCFD] text-zinc-900 font-sans">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200/60 border-b-4 text-xs text-black hover:bg-zinc-100 transition-colors mb-6 font-bold shadow-[2px_2px_0px_#000]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Banner */}
        <div className="border border-zinc-200/60 bg-white p-8 sm:p-10 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#8ce99a] border border-zinc-200/60 font-mono text-xs font-bold uppercase tracking-wider mb-4 shadow-[2px_2px_0px_#000]">
            <Sparkles className="w-3.5 h-3.5" />
            Empirical Developer Guides &middot; Zero Speculation
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-space mb-4">
            Open Source Contribution Playbooks
          </h1>
          <p className="text-zinc-700 text-sm sm:text-base leading-relaxed max-w-3xl">
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
              className="border border-zinc-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 border border-black font-mono text-[11px] font-bold">
                    <BookOpen className="w-3 h-3 text-amber-800" /> {guide.section}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                    <Clock className="w-3 h-3" /> {guide.readingTime}
                  </span>
                </div>

                <div className="mb-4 overflow-hidden border border-zinc-200/60 bg-zinc-100 shadow-[2px_2px_0px_#000]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/guides/${guide.slug}.jpg`}
                    alt={guide.title}
                    width={600}
                    height={315}
                    className="w-full h-40 object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <h2 className="text-xl font-bold font-space tracking-tight text-zinc-900 mb-2.5 leading-snug">
                  {guide.title}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 font-sans leading-relaxed mb-6 line-clamp-2">
                  {guide.description}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
                <span className="font-mono text-[11px] text-zinc-500">
                  By {guide.author} &middot; {guide.lastUpdated}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-black group-hover:text-emerald-700">
                  Read Guide <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* C-Rank Extractable Definition Box */}
        <div className="border border-zinc-200/60 bg-zinc-900 text-white p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            C-Rank™ Official Definition
          </div>
          <p className="text-zinc-200 text-sm sm:text-base leading-relaxed">
            <strong className="text-white">C-Rank™</strong> is an objective 0–100 percentile score and tier rating (S through D) assigned to public GitHub repositories based on external pull request merge rates (27.5%), maintainer first-response latency (15%), 180-day activity pulse (15%), and first-timer newcomer acceptance (10%).
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
