import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, GitMerge, Award, Github, Mail, Sparkles } from "lucide-react";

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
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-[#faf9f6] text-zinc-900">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        {/* Header Title */}
        <div className="border-2 border-black bg-white p-8 shadow-[6px_6px_0px_#000] mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#8ce99a] border-2 border-black font-mono text-xs font-bold uppercase tracking-wider mb-4 shadow-[2px_2px_0px_#000]">
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
          <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_#000]">
            <div className="w-10 h-10 bg-[#bfdbff] border-2 border-black flex items-center justify-center mb-4 shadow-[2px_2px_0px_#000]">
              <GitMerge className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-lg font-bold mb-2">Our Mission</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Eliminate contributor friction and protect newcomers from burnout by making repository hospitality transparent, measurable, and auditable.
            </p>
          </div>

          <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_#000]">
            <div className="w-10 h-10 bg-[#ffd93d] border-2 border-black flex items-center justify-center mb-4 shadow-[2px_2px_0px_#000]">
              <Award className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-lg font-bold mb-2">C-Rank™ Scoring</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              A balanced mathematical blend: 40% Merge Rate, 25% Time-to-First-Response, 20% First-Timer Merge Success, and 15% Review Depth &amp; Onboarding Docs.
            </p>
          </div>
        </div>

        {/* Team & Contact Section */}
        <div className="border-2 border-black bg-white p-8 shadow-[6px_6px_0px_#000] space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Engineering &amp; Contact</h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            GetMerged is built and maintained by independent open-source engineers with automated nightly recalculation pipelines indexing real GitHub GraphQL telemetry.
          </p>

          <div className="pt-4 flex flex-wrap gap-4 border-t-2 border-zinc-200">
            <a
              href="https://github.com/abhisheksoni27/getmerged"
              target="_blank"
              rel="noopener noreferrer"
              title="GetMerged GitHub Repository"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white font-mono text-xs font-bold border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-zinc-800 transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub Organization
            </a>

            <a
              href="mailto:support@getmerged.abhishekco.de"
              title="Contact GetMerged Engineering"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#8ce99a] text-black font-mono text-xs font-bold border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-[#72d482] transition-colors"
            >
              <Mail className="w-4 h-4" />
              support@getmerged.abhishekco.de
            </a>

            <Link
              href="/how-c-rank-works"
              title="Detailed C-Rank mathematical methodology"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#ffb3c7] text-black font-mono text-xs font-bold border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-[#ffa0b8] transition-colors"
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
