import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Compass, Sparkles, ArrowRight, Code2, ShieldCheck, Zap } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Find Open Source Projects to Contribute | GetMerged Contributor Hub",
  description:
    "Discover open-source repositories where your pull requests are welcomed. Filter by programming language, review speed, and vetted Good First Issues.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/contribute",
  },
  openGraph: {
    title: "Find Open Source Projects to Contribute | GetMerged",
    description: "Match with top-ranked repositories that actually review and merge contributor pull requests.",
    url: "https://getmerged.abhishekco.de/contribute",
    siteName: "GetMerged",
    type: "website",
  },
};

const POPULAR_LANGUAGES = [
  { name: "TypeScript", slug: "typescript", color: "bg-blue-950/70 border-blue-800/80 text-blue-700 border-blue-200" },
  { name: "Python", slug: "python", color: "bg-amber-950/70 border-amber-800/80 text-amber-700 border-amber-200" },
  { name: "Go", slug: "go", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { name: "Rust", slug: "rust", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { name: "Java", slug: "java", color: "bg-red-50 text-red-700 border-red-200" },
  { name: "C++", slug: "c-plus-plus", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { name: "Ruby", slug: "ruby", color: "bg-rose-950/70 border-rose-800/80 text-rose-700 border-rose-200" },
  { name: "Kotlin", slug: "kotlin", color: "bg-purple-950/70 border-purple-800/80 text-purple-700 border-purple-200" },
];

export default function ContributeHubPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Open Source Contributor Matching Hub",
    description: "Find vetted repositories with high merge rates and active Good First Issues.",
    url: "https://getmerged.abhishekco.de/contribute",
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-14">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border-emerald-800/80 border border-emerald-200/80 text-emerald-300 text-xs font-mono font-bold mb-4">
            <Compass className="h-3.5 w-3.5" /> Contributor Matchmaker
          </div>
          <h1 className="font-space text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight">
            Stop Guessing. <br />
            Find Repos That <span className="text-emerald-400 underline decoration-emerald-300">Actually Merge</span>.
          </h1>
          <p className="text-sm sm:text-base text-slate-400 font-sans mt-3">
            GetMerged tracks thousands of GitHub repositories to match you with welcoming maintainers, fast review turnarounds, and vetted Good First Issues.
          </p>
        </div>

        {/* Step 1: Pick an Ecosystem */}
        <div className="mb-12">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4 text-center">
            Select Your Primary Language Ecosystem
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {POPULAR_LANGUAGES.map((lang) => (
              <Link
                key={lang.slug}
                href={`/contribute/${lang.slug}`}
                title={`Explore ${lang.name} open source contribution opportunities`}
                className={`p-4 rounded-2xl border bg-[#111827] hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col items-center justify-center text-center group`}
              >
                <Code2 className="h-5 w-5 mb-2 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                <span className="font-space font-bold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors">
                  {lang.name}
                </span>
                <span className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-0.5">
                  Browse Repos <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* How C-Rank Guarantees Value */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800">
          <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 shadow-xs">
            <Zap className="h-5 w-5 text-amber-500 mb-2" />
            <h3 className="font-space text-sm font-bold text-slate-100">Sub-24h Reviews</h3>
            <p className="text-xs text-slate-400 font-sans mt-1">We filter out ghosted projects so your PRs receive real human feedback within hours.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 shadow-xs">
            <ShieldCheck className="h-5 w-5 text-emerald-500 mb-2" />
            <h3 className="font-space text-sm font-bold text-slate-100">High Merge Odds</h3>
            <p className="text-xs text-slate-400 font-sans mt-1">Ranked repositories maintain proven 80%+ external pull request acceptance rates.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 shadow-xs">
            <Sparkles className="h-5 w-5 text-purple-500 mb-2" />
            <h3 className="font-space text-sm font-bold text-slate-100">Vetted GFIs</h3>
            <p className="text-xs text-slate-400 font-sans mt-1">Directly view scored Good First Issues with verified mentor and maintainer guidance.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
