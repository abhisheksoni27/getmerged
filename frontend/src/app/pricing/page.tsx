import React from "react";
import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Pro Contributor Pricing & Plans | GetMerged",
  description:
    "Upgrade to GetMerged Pro for unlimited repository acceptance forecasts, live maintainer vibe checks, and automated pre-flight reviews.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/pricing",
  },
  openGraph: {
    title: "Pro Contributor Pricing & Plans | GetMerged",
    description:
      "Upgrade to GetMerged Pro for unlimited repository acceptance forecasts, live maintainer vibe checks, and automated pre-flight reviews.",
    url: "https://getmerged.abhishekco.de/pricing",
  },
};

export default function PricingPage() {
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
        name: "Pricing",
        item: "https://getmerged.abhishekco.de/pricing",
      },
    ],
  };

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "GetMerged Pro Contributor",
    description:
      "Unlimited open-source pull request acceptance forecasts, maintainer vibe checks, and automated pre-flight reviews.",
    offers: [
      {
        "@type": "Offer",
        name: "Community Free",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "Pro Contributor (Monthly)",
        price: "9.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "Pro Contributor (Annual)",
        price: "90.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    ],
  };

  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-transparent text-white font-sans">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {/* Semantic SSR Crawl Floor */}
      <section className="sr-only" aria-label="Pro Contributor Plans & Pricing">
        <h1>GetMerged Pro Contributor Plans & Pricing</h1>
        <p>
          Choose between free community access, Pro Contributor memberships, Recruiter Talent Passes, and Maintainer SLA verifications. GetMerged provides objective telemetry on GitHub repository PR merge rates, code review latency, and first-time contributor success.
        </p>

        <article>
          <h2>Community Free Plan ($0/month)</h2>
          <p>
            Ideal for open source developers looking for active repositories. Includes unlimited repository discovery, public C-Rank scorecard inspections, basic PR merge rate statistics, and verified Good First Issue directories across 20+ ecosystems.
          </p>
          <ul>
            <li>Full access to repository rankings across Python, Rust, Go, TypeScript, C#, and Java</li>
            <li>Basic maintainer review response latency (p50 hours)</li>
            <li>Direct Good First Issue filters by language and seniority</li>
            <li>Standard search and public profile views</li>
          </ul>
        </article>

        <article>
          <h2>Pro Contributor Plan ($9/month or $90/year)</h2>
          <p>
            Engineered for serious open source contributors and job seekers aiming to build verifiable public engineering credentials. Features unlimited pull request acceptance forecasting, AI maintainer vibe checks, and automated pre-flight reviews.
          </p>
          <ul>
            <li>Unlimited AI pull request acceptance forecasts and line-of-code sweet spot analysis</li>
            <li>Maintainer persona breakdowns, review patience scores, and top contribution dos/donts</li>
            <li>Pre-flight pull request reviews before opening upstream PRs</li>
            <li>Verified Contributor badge and prioritized repository watch alerts</li>
            <li>Daily email digests for freshly tagged Good First Issues in your favorite stacks</li>
          </ul>
        </article>

        <article>
          <h2>Recruiter & CTO Talent Pass ($49/month)</h2>
          <p>
            Designed for engineering leaders and technical recruiters hiring verified open-source engineers. Filter contributors by real merged PR complexity, language mastery, and maintainer reviews.
          </p>
          <ul>
            <li>Search across verified contributor profiles by ecosystem and merge history</li>
            <li>Direct candidate outreach and GitHub portfolio verification</li>
            <li>Engineering velocity insights and PR review quality metrics</li>
          </ul>
        </article>

        <article>
          <h2>Frequently Asked Questions About GetMerged Pricing</h2>
          <section>
            <h3>Can I cancel my Pro subscription at any time?</h3>
            <p>Yes, you can cancel your subscription at any time from your account settings with zero cancellation fees.</p>
          </section>
          <section>
            <h3>How do PR acceptance forecasts work?</h3>
            <p>Our machine learning pipeline analyzes historical PR diff sizes, test coverage requirements, review rounds, and maintainer activity patterns to estimate the acceptance likelihood and turnaround time for your pull request.</p>
          </section>
          <section>
            <h3>Is there a discount for annual billing?</h3>
            <p>Yes, choosing annual billing gives you two months free ($90/year instead of $108/year).</p>
          </section>
        </article>
      </section>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <React.Suspense fallback={<div className="text-center py-20 text-zinc-400 font-mono text-xs">Loading pricing plans...</div>}>
          <PricingClient />
        </React.Suspense>
      </main>
      <Footer />
    </div>
  );
}
