import React from "react";
import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TalentClient } from "./TalentClient";

export const metadata: Metadata = {
  title: "WorkDone Database - Search Developers by Proof of Work | GetMerged",
  description:
    "Stop screening resume buzzwords. Search 50,000+ software engineers indexed by real pull requests merged into active open-source codebases. Filter by language, Karma reputation, and codebase seniority.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "https://getmerged.abhishekco.de/talent",
  },
  openGraph: {
    title: "WorkDone Database - Search Developers by Proof of Work | GetMerged",
    description:
      "Stop screening resume buzzwords. Search verified software engineers based on actual code merges and maintainer reviews in real production open-source repositories.",
    url: "https://getmerged.abhishekco.de/talent",
    siteName: "GetMerged",
  },
  twitter: {
    card: "summary_large_image",
    title: "WorkDone Database - Search Developers by Proof of Work | GetMerged",
    description:
      "Stop screening resume buzzwords. Search verified software engineers based on actual code merges and maintainer reviews in real production open-source repositories.",
  },
};

export default function TalentPage() {
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
        name: "WorkDone Database (Talent)",
        item: "https://getmerged.abhishekco.de/talent",
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-white font-sans dev-grid-pattern">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Semantic SSR Crawl Floor */}
      <section className="sr-only" aria-label="WorkDone Database Overview">
        <h2>WorkDone Database - Search Developers by Actual Work Done</h2>
        <p>
          Index of verified software engineers evaluated on actual GitHub pull request merges across Kubernetes, Next.js, Envoy, Tokio, PyTorch, and top open-source ecosystems.
        </p>
      </section>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <TalentClient />
      </main>

      <Footer />
    </div>
  );
}
