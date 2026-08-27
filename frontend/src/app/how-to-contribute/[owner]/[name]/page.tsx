import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo, GoodFirstIssueItem } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { getLanguageSlug, displayNameFromSlug } from "@/lib/languageSlug";
import {
  ArrowRight,
  ExternalLink,
  Clock,
  GitPullRequest,
  Sparkles,
  Users,
} from "lucide-react";

export const revalidate = 3600;

const SITE_URL = "https://getmerged.abhishekco.de";

interface GuidePageProps {
  params: Promise<{ owner: string; name: string }>;
}

async function getRepoData(fullName: string): Promise<Repo | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rawList = data.data || [];
    return (
      rawList.find((r: Repo) => r.full_name.toLowerCase() === fullName.toLowerCase()) || rawList[0] || null
    );
  } catch (e) {
    console.error("SSR fetch failed for guide:", fullName, e);
    return null;
  }
}

async function getGoodFirstIssues(repoId: string): Promise<GoodFirstIssueItem[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos/${encodeURIComponent(repoId)}/good-first-issues`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error("SSR fetch failed for guide issues:", repoId, e);
    return [];
  }
}

function hoursLabel(h?: number): string {
  if (!h || h <= 0) return "no recent data";
  if (h < 24) return `~${Math.round(h)} hours`;
  return `~${Math.round(h / 24)} days`;
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;
  const title = `How to Contribute to ${fullName}: A Data-Backed Beginner's Guide | GetMerged`;
  const description = `Real contribution data for ${fullName}: PR merge rate, maintainer response times, first-timer success, and open good first issues - so your first pull request lands.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/how-to-contribute/${fullName}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/how-to-contribute/${fullName}`,
      siteName: "GetMerged",
      type: "article",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function HowToContributePage({ params }: GuidePageProps) {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;
  const repo = await getRepoData(fullName);

  if (!repo) {
    notFound();
  }

  const issues = await getGoodFirstIssues(String(repo.id));
  const langDisplay = displayNameFromSlug(repo.language || "");
  const langSlug = langDisplay ? getLanguageSlug(langDisplay) : "";

  const mergeRate = Math.round(repo.external_pr_merge_rate ?? 0);
  const firstTimer = Math.round(repo.first_timer_success_rate ?? 0);
  const responseH = repo.response_p50_hours ?? repo.time_to_first_response_hours ?? 0;
  const gfiCount = repo.good_first_issue_count ?? 0;
  const maintainers = repo.bus_factor ?? repo.distinct_maintainer_count ?? 0;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${fullName} beginner-friendly?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            firstTimer > 0
              ? `${firstTimer}% of first-time pull requests to ${fullName} have been merged, with a median first review in ${hoursLabel(responseH)}.`
              : `${fullName} has a C-Rank of ${repo.c_rank_tier ?? "?"} on GetMerged based on its external PR merge and response history.`,
        },
      },
      {
        "@type": "Question",
        name: `What is the PR merge rate of ${fullName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${mergeRate}% of external (non-maintainer) pull requests to ${fullName} get merged.`,
        },
      },
      ...(gfiCount > 0
        ? [
            {
              "@type": "Question",
              name: `Does ${fullName} have good first issues?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `Yes - ${gfiCount} good first issues are currently open on ${fullName}.`,
              },
            },
          ]
        : []),
    ],
  };

  const steps = [
    {
      title: "Pick a starter issue",
      body:
        gfiCount > 0
          ? `${fullName} currently labels ${gfiCount} open issues as "good first issue". Start there - maintainers expect newcomers on those.`
          : `Browse ${fullName}'s issue tracker for docs or small bug fixes. No labeled starter issues right now, so pick something small and self-contained.`,
      icon: Sparkles,
    },
    {
      title: "Time your pull request",
      body: `Median first review lands within ${hoursLabel(responseH)}. Open your PR when maintainers are active rather than right before a weekend.`,
      icon: Clock,
    },
    {
      title: "Keep it small and focused",
      body: `Outside PRs to this repo are merged at a ${mergeRate}% rate. Small, well-described PRs that pass CI consistently outperform large ones.`,
      icon: GitPullRequest,
    },
    {
      title: "Engage with review feedback",
      body: `${maintainers > 0 ? `${maintainers} active maintainer${maintainers === 1 ? "" : "s"}` : "The maintainers"} review contributions here. Respond to comments promptly - responsiveness is the strongest predictor of getting merged.`,
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8 border-b border-zinc-200/80 pb-6">
          <h1 className="font-space text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
            How to Contribute to {fullName}
          </h1>
          <p className="text-sm text-zinc-600 font-sans mt-2">
            A practical guide backed by {fullName}&apos;s real pull-request history - not guesswork.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { label: "PR merge rate", value: `${mergeRate}%` },
            { label: "First review", value: hoursLabel(responseH) },
            { label: "First-timer success", value: firstTimer > 0 ? `${firstTimer}%` : " - " },
            { label: "C-Rank", value: `${repo.c_rank_tier ?? "?"} Tier` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-b-2 border-b-zinc-900/20 border-zinc-200 bg-white p-3 text-center">
              <div className="font-space text-lg font-extrabold text-zinc-900">{stat.value}</div>
              <div className="text-[10px] font-mono uppercase tracking-wide text-zinc-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Steps */}
        <section className="space-y-6 mb-12">
          <h2 className="font-space text-xl font-bold text-zinc-900">Your game plan</h2>
          {steps.map((step, i) => (
            <div key={step.title} className="flex gap-4">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-zinc-900 text-white font-space font-bold flex items-center justify-center text-sm">
                {i + 1}
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                  <step.icon className="h-4 w-4 text-emerald-700" /> {step.title}
                </h3>
                <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Open good first issues */}
        {issues.length > 0 && (
          <section className="mb-12">
            <h2 className="font-space text-xl font-bold text-zinc-900 mb-4">Open good first issues</h2>
            <div className="space-y-3">
              {issues.slice(0, 5).map((issue) => (
                <a
                  key={issue.id}
                  href={issue.url}
                  title={`View good first issue #${issue.issue_number} on GitHub`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-xl border border-b-2 border-b-zinc-900/10 border-zinc-200 bg-white hover:border-emerald-500 hover:border-b-emerald-700 transition-all group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-zinc-800 group-hover:text-emerald-800 line-clamp-1">
                      {issue.title}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-400 group-hover:text-emerald-600" />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 mt-1 block">#{issue.issue_number}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Cross links */}
        <section className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/${fullName}`}
            title={`Open full contributor scorecard for ${fullName}`}
            className="flex-1 px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            View Full Scorecard <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={repo.github_url || `https://github.com/${fullName}`}
            title={`Open ${fullName} on GitHub`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-5 py-3 rounded-xl border border-zinc-300 hover:border-zinc-500 text-zinc-700 font-bold text-sm inline-flex items-center justify-center gap-2 transition-all"
          >
            Open on GitHub <ExternalLink className="h-4 w-4" />
          </a>
        </section>

        {langSlug && (
          <p className="mt-8 text-xs text-zinc-500">
            Looking for more? See{" "}
            <Link
              href={`/contribute/${langSlug}?level=beginner`}
              title={`Best ${langDisplay} repositories for first-time contributors`}
              className="text-emerald-700 hover:underline font-semibold"
            >
              best {langDisplay} repos for beginners
            </Link>
            .
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
