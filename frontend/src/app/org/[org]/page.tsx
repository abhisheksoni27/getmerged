import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { OrgClaimButton } from "@/components/OrgClaimButton";
import { OrgConsoleCard } from "@/components/OrgConsoleCard";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import {
  Building2,
  GitPullRequest,
  Clock,
  Users,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export const revalidate = 3600; // Edge cache for 1 hour

interface OrgPageProps {
  params: Promise<{ org: string }>;
}

async function fetchOrgRepos(org: string): Promise<Repo[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos?owner=${encodeURIComponent(org)}&per_page=30&sort=c_rank_score&order=desc`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data.repos || [];
  } catch (err) {
    console.error("fetchOrgRepos error:", err);
    return [];
  }
}

export async function generateMetadata({ params }: OrgPageProps): Promise<Metadata> {
  const { org } = await params;
  const repos = await fetchOrgRepos(org);

  if (repos.length === 0) {
    return { title: "Organization Not Found | GetMerged" };
  }

  const title = `${org} Contributor Reviews & Open Source Repos | GetMerged`;
  const description = `Explore ${repos.length} open-source repositories from ${org}. View real PR merge rates, maintainer response times, 90-day bus factor, and Good First Issues.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://getmerged.abhishekco.de/org/${org}`,
    },
    openGraph: {
      title,
      description,
      url: `https://getmerged.abhishekco.de/org/${org}`,
      siteName: "GetMerged",
      type: "website",
    },
  };
}

export default async function OrgPage({ params }: OrgPageProps) {
  const { org } = await params;
  const repos = await fetchOrgRepos(org);

  // Strict anti-DOS / empty route protection: Return 404 immediately if org has no tracked repos
  if (!repos || repos.length === 0) {
    notFound();
  }

  const avgMergeRate =
    repos.reduce((acc, r) => acc + (r.external_pr_merge_rate || 0), 0) / repos.length;
  const avgResponseHours =
    repos.reduce((acc, r) => acc + (r.response_p50_hours || r.time_to_first_response_hours || 0), 0) /
    repos.length;
  const totalStars = repos.reduce((acc, r) => acc + (r.stars || 0), 0);

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
        name: "Organizations",
        item: "https://getmerged.abhishekco.de/repos",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: org,
        item: `https://getmerged.abhishekco.de/org/${org}`,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${org} Repositories Ranked by C-Rank™`,
    description: `Open-source repositories maintained by ${org}, scored by maintainer responsiveness and pull request merge rates.`,
    itemListElement: repos.map((repo, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: repo.full_name,
      url: `https://getmerged.abhishekco.de/${repo.full_name}`,
    })),
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Header Section */}
        <div className="mb-8 border-b border-[var(--border-subtle)] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300/80 text-emerald-300 text-xs font-mono font-bold mb-3">
            <Building2 className="h-3.5 w-3.5" /> Organization Intelligence
          </div>
          <h1 className="font-space text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {org} <span className="text-[var(--text-secondary)] font-normal text-xl sm:text-2xl">({repos.length} Repositories)</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] font-sans mt-2 max-w-2xl">
            Maintainer responsiveness benchmarks, pull request merge probabilities, and beginner friendliness metrics for repositories maintained by <strong>{org}</strong>.
          </p>

          {/* Org Aggregated Macro Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <div className="p-4 rounded-2xl surface-base border border-[var(--border-subtle)] shadow-xs">
              <span className="text-xs font-mono text-[var(--text-secondary)] flex items-center gap-1.5">
                <GitPullRequest className="h-3.5 w-3.5 text-blue-500" /> Avg Merge Rate
              </span>
              <p className="font-space text-xl font-bold text-[var(--text-primary)] mt-1">{avgMergeRate.toFixed(1)}%</p>
            </div>
            <div className="p-4 rounded-2xl surface-base border border-[var(--border-subtle)] shadow-xs">
              <span className="text-xs font-mono text-[var(--text-secondary)] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" /> Avg Response Velocity
              </span>
              <p className="font-space text-xl font-bold text-[var(--text-primary)] mt-1">{avgResponseHours.toFixed(1)}h</p>
            </div>
            <div className="p-4 rounded-2xl surface-base border border-[var(--border-subtle)] shadow-xs">
              <span className="text-xs font-mono text-[var(--text-secondary)] flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-purple-500" /> Total GitHub Stars
              </span>
              <p className="font-space text-xl font-bold text-[var(--text-primary)] mt-1">{totalStars.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Org-wide C-Rank console (paid tier w/ peer benchmarks) */}
        <OrgConsoleCard org={org} />

        {/* Repository Grid */}
        <div className="space-y-4">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="p-5 rounded-2xl border border-[var(--border-subtle)] surface-base hover:border-emerald-500/80 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    {repo.c_rank_tier || repo.class_rank || "A"} Tier
                  </span>
                  <span className="text-xs font-mono surface-elevated text-[var(--text-secondary)] px-2 py-0.5 rounded-md font-medium">
                    {repo.language || "Multi-language"}
                  </span>
                  {(repo.good_first_issue_count ?? 0) > 0 && (
                    <span className="text-xs font-mono bg-emerald-950/70 border-emerald-800/80 text-emerald-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-emerald-200/60">
                      <Sparkles className="h-3 w-3" /> {repo.good_first_issue_count} GFIs
                    </span>
                  )}
                </div>
                <h2 className="font-space text-lg font-bold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
                  <Link prefetch={false}
                    href={`/${repo.full_name}`}
                    title={`View contributor metrics for ${repo.full_name}`}
                    className="hover:underline flex items-center gap-1.5"
                  >
                    {repo.full_name}
                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                  </Link>
                </h2>
                {repo.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                    {repo.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs font-mono text-[var(--text-secondary)] flex-wrap">
                  <span>Merge Rate: <strong className="text-[var(--text-primary)]">{(repo.external_pr_merge_rate || 0).toFixed(1)}%</strong></span>
                  <span>Response: <strong className="text-[var(--text-primary)]">{(repo.response_p50_hours || repo.time_to_first_response_hours || 0).toFixed(1)}h</strong></span>
                  <span>Bus Factor: <strong className="text-[var(--text-primary)]">{repo.bus_factor ?? 0} maintainers</strong></span>
                </div>
              </div>

              <div className="shrink-0 self-start sm:self-center flex flex-col items-stretch gap-2">
                <Link prefetch={false}
                  href={`/${repo.full_name}`}
                  title={`Open full scorecard for ${repo.full_name}`}
                  className="px-4 py-2 rounded-xl surface-elevated hover:bg-zinc-800 text-[var(--text-primary)] font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  View Scorecard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <OrgClaimButton fullName={repo.full_name} />
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
