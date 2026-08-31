import React, { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Open Source Repositories | GetMerged",
  description:
    "Compare open-source repositories side-by-side on PR merge rates, maintainer response time, C-Rank™, and contributor hospitality.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/compare",
  },
};

export default function CompareHubPage() {
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
        name: "Compare Repositories",
        item: "https://getmerged.abhishekco.de/compare",
      },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Compare Open Source Repositories | GetMerged",
    description:
      "Compare open-source repositories side-by-side on PR merge rates, maintainer response time, C-Rank™, and contributor hospitality.",
    url: "https://getmerged.abhishekco.de/compare",
    publisher: {
      "@type": "Organization",
      name: "GetMerged",
      url: "https://getmerged.abhishekco.de",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Semantic Crawl Floor */}
      <section className="sr-only" aria-label="Compare Open Source Repositories">
        <h1>Compare Open Source Repositories Side-by-Side</h1>
        <p>
          Evaluate two open-source GitHub repositories side-by-side on PR merge rates, code review turnaround time, maintainer responsiveness, 90-day bus factor, and first-time contributor success rates.
        </p>

        <section>
          <h2>Popular Repository Comparisons & Showdowns</h2>
          <ul>
            <li>
              <Link href="/compare/facebook/react/vs/vuejs/vue">
                React vs Vue.js Pull Request Merge Rate & Review Latency Comparison
              </Link>
              <p>Compare developer contribution turnaround and maintainer velocity between React and Vue.</p>
            </li>
            <li>
              <Link href="/compare/vercel/next.js/vs/remix-run/remix">
                Next.js vs Remix Code Review Turnaround & Merge Likelihood Showdown
              </Link>
              <p>Compare full-stack React framework maintainer responsiveness and contributor welcoming scores.</p>
            </li>
            <li>
              <Link href="/compare/golang/go/vs/rust-lang/rust">
                Go vs Rust Open Source Contributor Experience & PR Review Speed
              </Link>
              <p>Analyze maintainer responsiveness and newcomer acceptance rates between the Go and Rust language teams.</p>
            </li>
            <li>
              <Link href="/compare/fastify/fastify/vs/expressjs/express">
                Fastify vs Express.js Maintainer Activity & Pull Request Turnaround
              </Link>
              <p>Benchmark review latency and first-timer acceptance odds across Node.js backend frameworks.</p>
            </li>
            <li>
              <Link href="/compare/oven-sh/bun/vs/nodejs/node">
                Bun vs Node.js GitHub Repository Review Speed & Merge Metrics
              </Link>
              <p>Side-by-side JavaScript runtime contribution statistics, PR sweet spots, and review velocity.</p>
            </li>
            <li>
              <Link href="/compare/tailwindlabs/tailwindcss/vs/twbs/bootstrap">
                Tailwind CSS vs Bootstrap Contributor Hospitality & PR Acceptance Odds
              </Link>
              <p>Evaluate CSS framework maintainer engagement, review speed, and open-source contribution guidelines.</p>
            </li>
          </ul>
        </section>

        <section>
          <h2>How GetMerged Compares Open Source Projects</h2>
          <p>
            Every comparison computes objective metrics based on public GitHub activity from the past 180 days:
          </p>
          <ul>
            <li><strong>External PR Merge Rate</strong>: The percentage of submitted pull requests from non-core contributors that get merged into the main branch.</li>
            <li><strong>Median Response Latency (p50 hours)</strong>: How quickly maintainers write their first review comment on an incoming external PR.</li>
            <li><strong>First-Time Contributor Success Rate</strong>: The percentage of first-time open-source contributors who successfully get their initial PR merged.</li>
            <li><strong>90-Day Active Bus Factor</strong>: Number of distinct maintainers who actively reviewed and merged code over the last quarter.</li>
          </ul>
        </section>
      </section>

      <Suspense
        fallback={
          <div className="min-h-screen bg-black flex items-center justify-center font-mono text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              Loading Compare Tool...
            </div>
          </div>
        }
      >
        <CompareClient />
      </Suspense>
    </>
  );
}
