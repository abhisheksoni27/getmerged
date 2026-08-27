import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, GitMerge, Award, Mail, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "About GetMerged - Glassdoor for Open-Source Repositories",
  description: "Learn why we built GetMerged, how C-Rank™ telemetry works, our team, and how to get in touch.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/about",
  },
  openGraph: {
    title: "About GetMerged - The Open-Source Welcoming Index",
    description: "Objective empirical data measuring open-source PR acceptance and maintainer velocity.",
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
    description: "GetMerged is an open-source analytics platform providing C-Rank™ metrics for GitHub repositories.",
    publisher: {
      "@type": "Organization",
      name: "GetMerged",
      url: "https://getmerged.abhishekco.de",
      logo: "https://getmerged.abhishekco.de/icon.svg",
      sameAs: ["https://github.com/abhisheksoni27/getmerged"],
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFCFD] text-zinc-900">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        {/* Header Title */}
        <div className="border border-zinc-200/60 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-zinc-200/60 font-mono text-xs font-bold uppercase tracking-wider mb-4 ">
            <Sparkles className="w-3.5 h-3.5" />
            Empirical Telemetry &middot; Zero Speculation
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Glassdoor for Open-Source Repositories
          </h1>
          <p className="text-zinc-700 text-base sm:text-lg leading-relaxed">
            Millions of developers waste weeks writing pull requests for ghost projects or hostile codebases. GetMerged scores 53,000+ public GitHub repositories on reproducible math: merge rates, response latency, and first-timer success.
          </p>
        </div>

        {/* Mission & Methodology Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="border border-zinc-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="w-10 h-10 bg-[#bfdbff] border border-zinc-200/60 flex items-center justify-center mb-4 ">
              <GitMerge className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-lg font-bold mb-2">Our Mission</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Eliminate contributor friction and protect newcomers from burnout by making repository hospitality transparent, measurable, and auditable.
            </p>
          </div>

          <div className="border border-zinc-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="w-10 h-10 bg-[#ffd93d] border border-zinc-200/60 flex items-center justify-center mb-4 ">
              <Award className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-lg font-bold mb-2">C-Rank™ Scoring</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              A balanced mathematical blend: 40% Merge Rate, 25% Time-to-First-Response, 20% First-Timer Merge Success, and 15% Review Depth &amp; Onboarding Docs.
            </p>
          </div>
        </div>

        {/* Team & Contact Section */}
        <div className="border border-zinc-200/60 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Engineering &amp; Contact</h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            GetMerged is built and maintained by independent open-source engineers with automated nightly recalculation pipelines indexing real GitHub GraphQL telemetry.
          </p>

          <div className="pt-4 flex flex-wrap gap-4 border-t-2 border-zinc-200">
            <a
              href="https://github.com/GetMergedApp"
              target="_blank"
              rel="noopener noreferrer"
              title="GetMerged GitHub Organization"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white font-mono text-xs font-bold border border-zinc-200/60  hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub Organization
            </a>

            <a
              href="mailto:hi@abhishekco.de"
              title="Contact GetMerged Engineering"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-black font-mono text-xs font-bold border border-zinc-200/60  hover:bg-[#72d482] transition-colors"
            >
              <Mail className="w-4 h-4" />
              hi@abhishekco.de
            </a>

            <Link
              href="/how-c-rank-works"
              title="Detailed C-Rank mathematical methodology"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#ffb3c7] text-black font-mono text-xs font-bold border border-zinc-200/60  hover:bg-[#ffa0b8] transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Read Scoring Methodology
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
