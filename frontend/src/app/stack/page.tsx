import React from "react";
import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import StackClient from "./StackClient";

export const metadata: Metadata = {
  title: "Find Good First Issues in Your Tech Stack | Open Source Finder | GetMerged",
  description:
    "Scan your package.json, go.mod, or Cargo.toml to instantly find beginner-friendly Good First Issues and fast-reviewing open-source libraries in your tech stack.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/stack",
  },
  openGraph: {
    title: "Find Good First Issues in Your Tech Stack | GetMerged",
    description:
      "Scan your project dependencies to find open beginner issues and active maintainers in the exact packages you use every day.",
    url: "https://getmerged.abhishekco.de/stack",
  },
};

export default function StackPage() {
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
        name: "Stalk My Stack",
        item: "https://getmerged.abhishekco.de/stack",
      },
    ],
  };

  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GetMerged Dependency Stack Stalker",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description:
      "Telemetry radar for open-source software dependencies and maintainer health monitoring.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      
      {/* Semantic SSR Crawl Floor */}
      <section className="sr-only" aria-label="Tech Stack Dependency Health Radar">
        <h2>Tech Stack Dependency Health Radar & Open Source Contribution Finder</h2>
        <p>
          Inspect your JavaScript, TypeScript, Go, Rust, or Python dependencies for maintainer responsiveness, bus factor risks, and open Good-First-Issues.
        </p>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <StackClient />
      </main>
      <Footer />
    </div>
  );
}
