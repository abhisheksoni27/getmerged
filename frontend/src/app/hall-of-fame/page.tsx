import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Trophy } from "lucide-react";
import { RepoCard } from "@/components/RepoCard";

export const metadata: Metadata = {
  title: "Open Source Hall of Fame (S-Tier Repositories) - GetMerged",
  description: "The Hall of Fame showcases S-Tier public GitHub repositories with elite PR merge rates and rapid maintainer responses.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/hall-of-fame",
  },
  openGraph: {
    title: "Open Source Hall of Fame - GetMerged",
    description: "Featured showcase of top S-Tier open-source repositories welcoming contributors.",
    url: "https://getmerged.abhishekco.de/hall-of-fame",
    siteName: "GetMerged",
  },
};

async function getSTierRepos(): Promise<Repo[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?tier=S&sort=c_rank_score&order=desc&per_page=30`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data.repos || [];
  } catch (e) {
    console.error("Failed to fetch S-tier repos:", e);
    return [];
  }
}

export default async function HallOfFamePage() {
  const repos = await getSTierRepos();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Open Source Hall of Fame (S-Tier Repositories)",
    description: "Featured showcase of top S-Tier open-source repositories welcoming contributors.",
    itemListElement: repos.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.full_name,
      item: {
        "@type": "SoftwareSourceCode",
        name: r.full_name,
        url: `https://getmerged.abhishekco.de/${r.full_name}`,
        programmingLanguage: r.language || "Other",
        codeRepository: r.github_url || `https://github.com/${r.full_name}`,
      },
    })),
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
        name: "Hall of Fame",
        item: "https://getmerged.abhishekco.de/hall-of-fame",
      },
    ],
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6] dev-grid-pattern">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full text-zinc-800">
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-600 hover:text-zinc-900 transition-colors mb-6 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        <div className="rounded-3xl bg-white p-6 sm:p-10 border border-zinc-200/80 shadow-xs mb-10">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-900 font-mono">
              <Trophy className="h-3.5 w-3.5 text-emerald-700" /> S-Tier Showcase
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight font-space">
            Open Source Hall of Fame
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed font-sans">
            These elite repositories have earned an <strong>S-Tier C-Rank™</strong> score. Maintainers in the Hall of Fame merge external PRs rapidly, communicate constructively, and provide standard-setting onboarding for new contributors.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-zinc-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Telemetry updated: {new Date().toUTCString().slice(0, 16)} UTC (Daily Sync)</span>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between border-b border-zinc-200 pb-4">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 font-space">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            S-Tier Repositories ({repos.length})
          </h2>
          <span className="text-xs text-zinc-500 font-mono">Updated Daily</span>
        </div>

        {repos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
            {repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-12 text-center text-zinc-500 text-xs mb-12 border border-dashed border-zinc-300 font-sans">
            No S-Tier repositories indexed yet.
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
