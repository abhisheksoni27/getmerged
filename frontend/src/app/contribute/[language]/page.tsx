import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MatchRepo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { getLanguageFromSlug, getLanguageSlug, displayNameFromSlug } from "@/lib/languageSlug";
import {
  Sparkles,
  ArrowRight,
  ExternalLink,
  Lock,
  Compass,
  CheckCircle2,
} from "lucide-react";

export const revalidate = 3600;

const LEVELS = [
  { value: "beginner", label: "First-time contributor" },
  { value: "experienced", label: "Experienced contributor" },
] as const;

interface ContributeLangPageProps {
  params: Promise<{ language: string }>;
  searchParams: Promise<{ level?: string }>;
}

const SITE_URL = "https://getmerged.abhishekco.de";

function normalizeLevel(raw?: string): "beginner" | "experienced" {
  return raw === "experienced" ? "experienced" : "beginner";
}

async function fetchMatches(language: string, level: string): Promise<MatchRepo[]> {
  try {
    const rawLang = getLanguageFromSlug(language);
    const res = await fetch(
      `${API_BASE_URL}/api/v1/match?languages=${encodeURIComponent(rawLang)}&level=${level}&limit=15`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error("fetchMatches error:", err);
    return [];
  }
}

function buildMetadata(language: string, level: string): Metadata {
  const canonicalLang = getLanguageFromSlug(language);
  const audience =
    level === "experienced" ? "Experienced Developers" : "Beginners";
  const title = `Best ${canonicalLang} Open Source Repositories for ${audience} | GetMerged`;
  const description = `Hand-picked ${canonicalLang} GitHub repositories matched to ${level === "experienced" ? "experienced" : "first-time"} contributors - ranked by real merge rates, maintainer response times, and first-PR success.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/contribute/${language}?level=${level}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/contribute/${language}?level=${level}`,
      siteName: "GetMerged",
      type: "website",
    },
  };
}

export async function generateMetadata({ params, searchParams }: ContributeLangPageProps): Promise<Metadata> {
  const { language } = await params;
  const { level } = await searchParams;
  return buildMetadata(language, normalizeLevel(level));
}

export default async function ContributeLangPage({ params, searchParams }: ContributeLangPageProps) {
  const { language } = await params;
  const { level: rawLevel } = await searchParams;
  const level = normalizeLevel(rawLevel);
  const canonicalLang = getLanguageFromSlug(language);

  if (!canonicalLang) {
    notFound();
  }

  const repos = await fetchMatches(language, level);

  if (!repos || repos.length === 0) {
    notFound();
  }

  // Showcase Top 3, gate remaining behind sign-in
  const visibleRepos = repos.slice(0, 3);
  const gatedCount = Math.max(0, repos.length - 3);
  const langSlug = getLanguageSlug(canonicalLang);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Contribute Hub", item: `${SITE_URL}/contribute` },
      {
        "@type": "ListItem",
        position: 3,
        name: `${canonicalLang} for ${level === "experienced" ? "Experienced Devs" : "Beginners"}`,
        item: `${SITE_URL}/contribute/${langSlug}?level=${level}`,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Best ${canonicalLang} Repositories for ${level === "experienced" ? "Experienced" : "First-Time"} Contributors`,
    itemListElement: visibleRepos.map((repo, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: repo.full_name,
      url: `${SITE_URL}/${repo.full_name}`,
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Which ${canonicalLang} repositories are best for ${level === "experienced" ? "experienced developers" : "first-time contributors"}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Based on objective C-Rank data across merge rates, review turnaround, and first-PR success, the top ${canonicalLang} repositories include ${visibleRepos.map((r) => r.full_name).join(", ")}.`,
        },
      },
      {
        "@type": "Question",
        name: "How does GetMerged rank repositories?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "GetMerged scores public GitHub repos from S to D tier using objective metrics: external PR merge rate, time to first response, time to merge, and first-timer success rate.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-6 border-b border-white/[0.08] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300/80 text-emerald-300 text-xs font-mono font-bold mb-3">
            <Compass className="h-3.5 w-3.5" /> Contributor Matchmaker
          </div>
          <h1 className="font-space text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Best {canonicalLang} Repos to Contribute To
          </h1>
          <p className="text-sm text-zinc-300 font-sans mt-2 max-w-2xl">
            Matched to your experience level using real merge rates, maintainer response times, and first-PR success data.
          </p>
        </div>

        {/* Audience switcher */}
        <div className="flex gap-2 mb-8">
          {LEVELS.map((lv) => (
            <Link
              key={lv.value}
              href={`/contribute/${langSlug}?level=${lv.value}`}
              title={`Show best ${canonicalLang} repositories for ${lv.label.toLowerCase()}s`}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                lv.value === level
                  ? "bg-zinc-900 text-white border-white/[0.12]"
                  : "bg-zinc-900/80 text-zinc-300 border-white/[0.08] hover:border-white/[0.18]"
              }`}
            >
              {lv.label}
            </Link>
          ))}
        </div>

        {/* Visible Top 3 Matched Repos */}
        <div className="space-y-4 mb-6">
          {visibleRepos.map((repo) => (
            <div
              key={repo.id}
              className="p-5 rounded-2xl border border-b border-white/[0.1]/10 border-white/[0.08] bg-zinc-900/80 hover:border-emerald-500/80 hover:border-b-emerald-700 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {typeof repo.match_score === "number" && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-900 text-white">
                      {Math.round(repo.match_score)}% match
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 border-emerald-800/80 text-emerald-300">
                    {repo.c_rank_tier || repo.class_rank || "A"} Tier
                  </span>
                  {(repo.good_first_issue_count ?? 0) > 0 && (
                    <span className="text-xs font-mono bg-emerald-950/70 border-emerald-800/80 text-emerald-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-emerald-200/60">
                      <Sparkles className="h-3 w-3" /> {repo.good_first_issue_count} GFIs
                    </span>
                  )}
                </div>
                <h2 className="font-space text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                  <Link
                    href={`/${repo.full_name}`}
                    title={`View contributor metrics for ${repo.full_name}`}
                    className="hover:underline flex items-center gap-1.5"
                  >
                    {repo.full_name}
                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                  </Link>
                </h2>
                {repo.description && (
                  <p className="text-xs text-zinc-300 mt-1 line-clamp-2 leading-relaxed">{repo.description}</p>
                )}

                {/* Why this repo matches you */}
                {repo.reasons && repo.reasons.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {repo.reasons.slice(0, 3).map((reason) => (
                      <li key={reason} className="text-xs text-zinc-300 flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-px" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="shrink-0 self-start sm:self-center flex flex-col gap-2 items-stretch">
                <Link
                  href={`/${repo.full_name}`}
                  title={`Open full scorecard for ${repo.full_name}`}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  View Scorecard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/how-to-contribute/${repo.full_name}`}
                  title={`Read how to contribute to ${repo.full_name}`}
                  className="px-4 py-2 rounded-xl border border-white/[0.12] hover:border-zinc-500 text-zinc-300 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all"
                >
                  How to Contribute
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Conversion Gate */}
        {gatedCount > 0 && (
          <div className="rounded-3xl border-2 border-dashed border-emerald-300 bg-emerald-950/70 border-emerald-800/80/50 p-6 text-center mb-8">
            <Lock className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <h3 className="font-space text-lg font-bold text-white">
              Unlock {gatedCount}+ More {displayNameFromSlug(canonicalLang)} Opportunities
            </h3>
            <p className="text-xs text-zinc-300 font-sans mt-1 max-w-md mx-auto">
              Sign in with GitHub to view personalized matches, your Contributor Fit Radar, and weekly digest alerts.
            </p>
            <div className="mt-4">
              <Link
                href="/repos"
                title={`Explore all ranked ${canonicalLang} repositories on GetMerged`}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-2 transition-all shadow-xs"
              >
                Browse All Ranked Repositories <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
