import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  GitMerge,
  Mail,
  Sparkles,
  Code2,
  Terminal,
  FileCheck2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About GetMerged - Why We Built The Open-Source Welcoming Index",
  description:
    "The story, architecture, and roadmap of GetMerged. Built by developers tired of pull requests rotting in unmonitored GitHub backlogs.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/about",
  },
  openGraph: {
    title: "About GetMerged - Real Data on Open-Source Hospitality",
    description:
      "102,000+ public GitHub repositories scored nightly on real review turnaround, outside merge rates, and first-timer success.",
    url: "https://getmerged.abhishekco.de/about",
    siteName: "GetMerged",
  },
};

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About GetMerged",
    url: "https://getmerged.abhishekco.de/about",
    description:
      "GetMerged indexes public GitHub repositories using real activity: PR merge rates, review turnaround times, and first-time contributor success.",
    publisher: {
      "@type": "Organization",
      name: "GetMerged",
      url: "https://getmerged.abhishekco.de",
      logo: "https://getmerged.abhishekco.de/icon.svg",
      sameAs: ["https://github.com/GetMergedApp"],
    },
  };

  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-transparent text-[var(--text-primary)] font-sans">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        {/* Section 1: The Origin Story */}
        <div className="border border-[var(--border-subtle)] surface-base p-8 sm:p-10 rounded-3xl shadow-sm mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/25 font-mono text-xs font-bold rounded-xl mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Origin Story &middot; Built in Public
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 font-space text-[var(--text-primary)]">
            Why I Built GetMerged
          </h1>
          <div className="space-y-4 text-[var(--text-secondary)] text-sm sm:text-base leading-relaxed">
            {/* User writes personal story here */}
            <p>
              In 2024, I submitted 11 pull requests to open-source repositories with tens of thousands of stars. Three got reviewed. The remaining eight sat untouched in backlogs for months, eventually closed by automated bots when dependencies drifted.
            </p>
            <p>
              GitHub stars tell you if a repository is famous. They tell you nothing about whether a human maintainer will actually read your code. I wanted to build the tool I needed: a Glassdoor for open-source pull requests.
            </p>
          </div>
        </div>

        {/* Section 2: Core Architecture & Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="border border-[var(--border-subtle)] surface-base p-6 rounded-2xl shadow-sm space-y-3">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/25 rounded-xl flex items-center justify-center text-blue-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold font-space text-[var(--text-primary)]">Data Over Hype</h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              We score 102,000+ repositories every night across 9 objective signals - not curated popularity lists or sponsor endorsements. If a repo stops merging PRs, its score drops immediately.
            </p>
          </div>

          <div className="border border-[var(--border-subtle)] surface-base p-6 rounded-2xl shadow-sm space-y-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold font-space text-[var(--text-primary)]">Complete Transparency</h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Our tier boundaries, safety caps, and Bayesian shrinkage models are open for inspection on our methodology page. If our crawler gets something wrong, maintainers can dispute it with a 48h SLA.
            </p>
          </div>
        </div>

        {/* Section 3: The Engine */}
        <div className="border border-[var(--border-subtle)] surface-base p-8 rounded-3xl shadow-sm mb-12 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
            <Terminal className="w-4 h-4" /> Under the Hood
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-space text-[var(--text-primary)]">
            102k Repositories &middot; Nightly Telemetry Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            GetMerged evaluates 90-day rolling windows via the GitHub GraphQL API, isolating genuine outside contributors from automated dependency bots. Bayesian shrinkage ensures repos with only 1–2 PRs don&apos;t masquerade as S-tier, and solo maintainers trigger a bus-factor safety cap.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link prefetch={false}
              href="/how-c-rank-works"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-zinc-200 transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              Explore Methodology
            </Link>
            <Link prefetch={false}
              href="/methodology/changelog"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl surface-base border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Recalibration Changelog
            </Link>
          </div>
        </div>

        {/* Section 4: Contact & Community Links */}
        <div className="border border-[var(--border-subtle)] surface-base p-8 rounded-3xl shadow-sm space-y-6">
          <h2 className="text-xl font-bold font-space text-[var(--text-primary)]">Get in Touch</h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Have feedback on scoring, want to request an indexing queue sweep, or partner with GetMerged? Reach out directly.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <a
              href="mailto:hi@abhishekco.de"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-mono text-xs font-bold rounded-xl hover:bg-emerald-500 transition-colors shadow-sm"
            >
              <Mail className="w-4 h-4" />
              hi@abhishekco.de
            </a>

            <a
              href="https://github.com/GetMergedApp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-xs font-bold rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Code2 className="w-4 h-4" />
              GitHub Organization
            </a>

            <Link prefetch={false}
              href="/dispute"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-300 border border-amber-500/25 font-mono text-xs font-bold rounded-xl hover:bg-amber-500/20 transition-colors shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              Report Score Dispute (48h SLA)
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
