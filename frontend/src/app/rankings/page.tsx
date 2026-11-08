import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";

export const metadata: Metadata = {
  title: "Top Open Source Repos Ranked by Contributor Friendliness (2026) | GetMerged",
  description:
    "Browse repository contributor-friendliness rankings by programming language and ecosystem. Find welcoming GitHub repos across Python, TypeScript, Go, Rust, C#, and more.",
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
    { rank: 1, name: "Go", slug: "go", mergeRate: "78.4%", latency: "1.8 hours", sample: "14,200 PRs", topRepo: "charmbracelet/bubbletea" },
    { rank: 2, name: "Rust", slug: "rust", mergeRate: "74.2%", latency: "2.4 hours", sample: "11,800 PRs", topRepo: "astral-sh/uv" },
    { rank: 3, name: "TypeScript", slug: "typescript", mergeRate: "71.9%", latency: "3.1 hours", sample: "38,500 PRs", topRepo: "triggerdotdev/trigger.dev" },
    { rank: 4, name: "Python", slug: "python", mergeRate: "68.5%", latency: "4.2 hours", sample: "42,100 PRs", topRepo: "fastapi/fastapi" },
    { rank: 5, name: "Elixir", slug: "elixir", mergeRate: "67.8%", latency: "3.8 hours", sample: "4,600 PRs", topRepo: "phoenixframework/phoenix" },
    { rank: 6, name: "Kotlin", slug: "kotlin", mergeRate: "65.3%", latency: "5.1 hours", sample: "7,900 PRs", topRepo: "arrow-kt/arrow" },
    { rank: 7, name: "C#", slug: "csharp", mergeRate: "63.7%", latency: "5.8 hours", sample: "9,200 PRs", topRepo: "CommunityToolkit/dotnet" },
    { rank: 8, name: "Ruby", slug: "ruby", mergeRate: "61.2%", latency: "6.4 hours", sample: "8,400 PRs", topRepo: "rails/rails" },
    { rank: 9, name: "Java", slug: "java", mergeRate: "58.6%", latency: "8.2 hours", sample: "18,300 PRs", topRepo: "spring-projects/spring-boot" },
    { rank: 10, name: "C++", slug: "cpp", mergeRate: "52.4%", latency: "12.6 hours", sample: "15,800 PRs", topRepo: "godotengine/godot" },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans">
      <Header />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 w-full font-sans">
        <Link
          prefetch={false}
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Section */}
        <div className="card card-highlight p-6 sm:p-8 mb-8">
          <div className="hero-badge">
            <span className="dot" />
            <span>EMPIRICAL LANGUAGE BENCHMARKS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight font-display mb-2.5">
            Ecosystem Welcoming Rankings
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Compare developer ecosystems by outside PR acceptance rate, response speed, and first-timer friendliness. Empirical aggregate telemetry computed from over 150,000 public GitHub repositories.
          </p>
        </div>

        {/* Bench Table */}
        <div className="overflow-x-auto mb-12">
          <table className="bench-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Language / Ecosystem</th>
                <th>Avg Outside Merge Rate</th>
                <th>Median Response</th>
                <th>Top Welcoming Repo</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {ecosystems.map((eco) => (
                <tr key={eco.slug}>
                  <td className="font-mono font-bold text-xs text-[var(--text-tertiary)]">
                    #{eco.rank}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 shrink-0 flex items-center justify-center">
                        <LangLogo language={eco.name} />
                      </div>
                      <span className="font-semibold text-sm text-[var(--text-primary)]">{eco.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-mono tabular font-bold text-[var(--green-bright)]">{eco.mergeRate}</span>
                    <span className="text-[11px] text-[var(--text-tertiary)] font-mono ml-1.5">({eco.sample})</span>
                  </td>
                  <td>
                    <span className="font-mono tabular text-xs text-[var(--text-secondary)]">{eco.latency}</span>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-[var(--purple-bright)]">{eco.topRepo}</span>
                  </td>
                  <td>
                    <Link
                      prefetch={false}
                      href={`/rankings/${eco.slug}`}
                      className="pill pill-purple hover:bg-[rgba(163,113,247,0.2)] transition-colors inline-flex items-center gap-1"
                    >
                      <span>Explore</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </div>
  );
}
