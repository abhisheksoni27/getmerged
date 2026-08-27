import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Users, ArrowLeft, ArrowRight, Crown, Star } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { API_BASE_URL } from "@/lib/api";

const MIN_MAINTAINERS = 5;

export const metadata: Metadata = {
  title: "Community Powerhouses: Open-Source Repos with Many Maintainers | GetMerged",
  description: `A special collection of open-source repositories powered by ${MIN_MAINTAINERS}+ active maintainers - healthy bus factors, fast reviews, and resilient communities.`,
  alternates: {
    canonical: "https://getmerged.abhishekco.de/community-powerhouses",
  },
  openGraph: {
    title: "Community Powerhouses: Repos with Many Maintainers | GetMerged",
    description: `Discover repositories sustained by ${MIN_MAINTAINERS}+ distinct active maintainers.`,
    url: "https://getmerged.abhishekco.de/community-powerhouses",
    siteName: "GetMerged",
  },
};

interface PowerhouseRepo {
  id: string;
  full_name: string;
  language: string;
  stars: number;
  description: string;
  github_url: string;
  c_rank_tier: string;
  bus_factor: number;
}

async function getPowerhouses(): Promise<{ repos: PowerhouseRepo[]; total: number }> {
  const params = new URLSearchParams({
    min_maintainers: String(MIN_MAINTAINERS),
    sort: "stars",
    order: "desc",
    per_page: "50",
  });
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?${params.toString()}`, {
      next: { revalidate: 3600 },
      headers: { "X-Use-Cache": "false" },
    });
    if (!res.ok) return { repos: [], total: 0 };
    const data = await res.json();
    const repos: PowerhouseRepo[] = Array.isArray(data.data) ? data.data : [];
    return { repos, total: data.meta?.total ?? repos.length };
  } catch {
    return { repos: [], total: 0 };
  }
}

export default async function CommunityPowerhousesPage() {
  const { repos, total } = await getPowerhouses();

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Community Powerhouses",
    description: `Open-source repositories with ${MIN_MAINTAINERS} or more distinct active maintainers.`,
    url: "https://getmerged.abhishekco.de/community-powerhouses",
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0f172a] dev-grid-pattern">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full text-slate-200 font-sans">
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] border border-slate-800 text-xs text-slate-400 hover:text-slate-100 transition-colors mb-6 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        <div className="rounded-3xl bg-[#111827] p-6 sm:p-10 border border-slate-800 shadow-xs mb-10">
          <div className="flex items-center gap-2 mb-3.5">
            <span
              data-testid="powerhouse-badge"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-950/70 border-amber-800/80 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-300 font-mono"
            >
              <Crown className="h-3.5 w-3.5 text-amber-600" /> Community Powerhouses
            </span>
            <span
              data-testid="maintainer-threshold-badge"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-950/70 border-emerald-800/80 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-300 font-mono"
            >
              <Users className="h-3.5 w-3.5 text-emerald-400" /> {MIN_MAINTAINERS}+ Maintainers
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight font-space">
            Community Powerhouses
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed font-sans">
            Repositories sustained by many hands. Each project here is reviewed by{" "}
            {MIN_MAINTAINERS}+ distinct active maintainers - no single-person bottleneck,
            faster reviews, and a healthier contribution experience.
          </p>
          <p data-testid="collection-repo-count" className="mt-4 text-sm font-mono font-bold text-slate-100">
            {total} repositories in this collection
          </p>
        </div>

        {repos.length === 0 ? (
          <div className="rounded-2xl bg-[#111827] p-10 border border-slate-800 shadow-xs text-center">
            <Users className="h-8 w-8 mx-auto text-zinc-300 mb-3" />
            <p className="text-sm text-slate-400">
              No repositories currently meet the {MIN_MAINTAINERS}+ maintainer threshold. Check back after the next scoring snapshot.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {repos.map((repo) => {
              const [ownerPart, namePart] = repo.full_name.split("/");
              return (
                <Link
                  key={repo.id}
                  href={`/${repo.full_name}`}
                  title={`View ${repo.full_name} on GetMerged`}
                  className="group rounded-2xl bg-[#111827] p-6 border border-slate-800 shadow-xs hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl border border-slate-800 bg-[#1e293b] flex items-center justify-center shrink-0">
                        <LangLogo language={repo.language} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-space text-base font-bold text-slate-100 group-hover:text-slate-300 transition-colors truncate">
                          {ownerPart}/{namePart}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-950/70 border-emerald-800/80 border border-emerald-200 px-2 py-0.5 text-[11px] font-mono font-semibold text-emerald-300">
                          <Users className="h-3 w-3" />
                          {Math.round(repo.bus_factor)} maintainers
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans line-clamp-2">
                      {repo.description || "No description available."}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono font-semibold text-slate-100 group-hover:text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" /> {repo.stars.toLocaleString()}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
