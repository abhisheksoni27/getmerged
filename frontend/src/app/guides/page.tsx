import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { getAllGuides } from "@/lib/guides";
import { BookOpen, ArrowRight, ArrowLeft, Clock } from "lucide-react";

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

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans">
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
            <span>DEVELOPER KNOWLEDGE &amp; PLAYBOOKS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-display text-[var(--text-primary)] mb-2.5">
            Open Source Contribution Guides
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-3xl mb-4">
            Practical, step-by-step field guides on finding welcoming repositories, crafting pull requests that maintainers merge in hours, and navigating open-source etiquette.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill pill-green">✓ Sourced from 150k+ Repos</span>
            <span className="pill pill-purple">✓ Empirical PR Advice</span>
            <span className="pill font-mono">{guides.length} Published Playbooks</span>
          </div>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {guides.map((guide) => (
            <Link
              prefetch={false}
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="card p-5 hover:border-[var(--border-accent)] transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="pill pill-purple">
                    <BookOpen className="w-3 h-3" />
                    <span>{guide.section}</span>
                  </span>
                  <span className="pill font-mono">
                    <Clock className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span>{guide.readingTime}</span>
                  </span>
                </div>

                <h2 className="text-base font-bold font-sans tracking-tight text-[var(--text-primary)] group-hover:text-[var(--purple-bright)] transition-colors mb-2 leading-snug">
                  {guide.title}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed mb-4 line-clamp-3">
                  {guide.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--purple-bright)]">
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {guide.lastUpdated}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform">
                  Read Playbook <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
