import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { getAllGuides } from "@/lib/guides";
import { BookOpen, ArrowRight, ArrowLeft, Clock, ShieldCheck, Sparkles } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Open Source Contribution Guides & Tips | GetMerged",
  description:
    "Practical step-by-step guides on finding beginner-friendly GitHub repositories, writing great pull requests, and getting merged faster.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/guides",
  },
  openGraph: {
    title: "Open Source Contribution Guides & Tips | GetMerged",
    description:
      "Practical developer guides for open source contribution, finding active maintainers, and pull request best practices.",
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
    description: "Practical developer guides for finding active open source projects and making successful pull requests.",
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
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans">
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
        <Link prefetch={false}
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors mb-6 font-semibold shadow-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Banner */}
        <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 sm:p-10 rounded-2xl shadow-sm mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0D9668]/10 border border-[#0D9668]/30 text-[#0D9668] rounded-xl font-mono text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#0D9668]" />
            Developer Guides &middot; Actionable Playbooks
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-display text-[var(--text-primary)] mb-4">
            Open Source Contribution Guides
          </h1>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-3xl">
            Stop guessing whether maintainers will review your work. Our practical guides help you find active repositories looking for help, write clean pull requests, and get your code merged into main.
          </p>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {guides.map((guide) => (
            <Link prefetch={false}
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              title={`Read guide: ${guide.title}`}
              className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 rounded-2xl shadow-sm hover:border-[var(--border-hover)] hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#C4910A]/10 border border-[#C4910A]/30 text-[#C4910A] rounded-lg font-mono text-xs font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-[#C4910A]" /> {guide.section}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs text-[var(--text-tertiary)]">
                    <Clock className="w-3.5 h-3.5" /> {guide.readingTime}
                  </span>
                </div>

                <div className="mb-4 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/guides/${guide.slug}.jpg`}
                    alt={guide.title}
                    width={600}
                    height={315}
                    className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <h2 className="text-xl font-bold font-display tracking-tight text-[var(--text-primary)] mb-2.5 leading-snug">
                  {guide.title}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] font-sans leading-relaxed mb-6 line-clamp-2">
                  {guide.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--text-tertiary)]">
                  By {guide.author} &middot; {guide.lastUpdated}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[var(--color-primary)]">
                  Read Guide <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* C-Rank Extractable Definition Box */}
        <div className="border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] p-6 sm:p-8 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-[#0D9668] font-mono text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            Empirical C-Rank Benchmark Standard
          </div>
          <h3 className="text-xl font-bold font-display text-[var(--text-primary)] mb-2">
            How OpenDoor Benchmarks Repository Openness
          </h3>
          <p className="text-[var(--text-secondary)] text-sm sm:text-base leading-relaxed">
            Every repository in these guides is continuously audited across PR turnaround latency, first-time contributor conversion rates, maintainer bus factor, and external PR merge velocity.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
