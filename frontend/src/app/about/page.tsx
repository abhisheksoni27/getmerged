import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, GitMerge, Award, Mail, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "About GetMerged - The Open-Source Welcoming Index",
  description: "Learn why we built GetMerged, how we score open source projects, our mission, and how to get in touch.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/about",
  },
  openGraph: {
    title: "About GetMerged - The Open-Source Welcoming Index",
    description: "Real data measuring open-source PR acceptance, maintainer review speed, and contributor experience.",
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
    description: "GetMerged helps developers find active open source repositories that review and merge pull requests.",
    publisher: {
      "@type": "Organization",
      name: "GetMerged",
      url: "https://getmerged.abhishekco.de",
      logo: "https://getmerged.abhishekco.de/icon.svg",
      sameAs: ["https://github.com/abhisheksoni27/getmerged"],
    },
  };

  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-transparent text-white">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        {/* Header Title */}
        <div className="border border-white/[0.12] glass-panel p-8 shadow-sm mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#8ce99a] text-black border border-white/[0.12] font-mono text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            Real GitHub Data &middot; Zero Guesswork
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 font-space">
            Finding Open Source Projects That Actually Welcome You
          </h1>
          <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
            Developers often waste weeks writing pull requests for inactive projects or unresponsive teams. GetMerged indexes public GitHub repositories using real activity: PR merge rates, review turnaround times, and first-time contributor success.
          </p>
        </div>

        {/* Mission & Methodology Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="border border-white/[0.12] glass-panel p-6 shadow-sm">
            <div className="w-10 h-10 bg-[#bfdbff] border border-white/[0.12] flex items-center justify-center mb-4 shadow-sm">
              <GitMerge className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-lg font-bold mb-2">Our Mission</h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Help developers make meaningful open source contributions without the frustration of ghost towns and unanswered pull requests.
            </p>
          </div>

          <div className="border border-white/[0.12] glass-panel p-6 shadow-sm">
            <div className="w-10 h-10 bg-[#ffd93d] border border-white/[0.12] flex items-center justify-center mb-4 shadow-sm">
              <Award className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-lg font-bold mb-2">C-Rank™ Scoring</h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              A transparent breakdown: 40% Merge Rate, 25% Review Speed, 20% First-Timer Merge Success, and 15% Review Depth &amp; Documentation.
            </p>
          </div>
        </div>

        {/* Team & Contact Section */}
        <div className="border border-white/[0.12] glass-panel p-8 shadow-sm space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Built for Developers</h2>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            GetMerged is built and maintained by independent open-source developers, updated daily using public GitHub pull request and review data.
          </p>

          <div className="pt-4 flex flex-wrap gap-4 border-t-2 border-white/[0.1]">
            <a
              href="https://github.com/GetMergedApp"
              target="_blank"
              rel="noopener noreferrer"
              title="GetMerged GitHub Organization"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white font-mono text-xs font-bold border border-white/[0.12] shadow-sm hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub Organization
            </a>

            <a
              href="mailto:hi@abhishekco.de"
              title="Contact GetMerged Engineering"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-mono text-xs font-bold border border-white/[0.12] shadow-sm hover:bg-[#72d482] transition-colors"
            >
              <Mail className="w-4 h-4" />
              hi@abhishekco.de
            </a>

            <Link
              href="/how-c-rank-works"
              title="Detailed C-Rank mathematical methodology"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white font-mono text-xs font-bold border border-white/[0.12] shadow-sm hover:bg-[#ffa0b8] transition-colors"
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
