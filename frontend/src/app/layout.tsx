import type { Metadata } from "next";
import "./globals.css";
import { PostHogInit } from "@/app/posthog-init";

export const metadata: Metadata = {
  metadataBase: new URL("https://opendoor.abhishekco.de"),
  title: "opendoor — Glassdoor for Open Source Repositories | C-Rank™ Index",
  description: "Stop guessing which door is open. Discover public GitHub repositories where your pull requests are welcomed, reviewed fast, and merged.",
  keywords: [
    "open source",
    "github repositories",
    "first timer issues",
    "contributor friendly",
    "c-rank",
    "pull request merge rate",
    "maintainer response time",
    "open source contribution"
  ],
  alternates: {
    canonical: "https://opendoor.abhishekco.de",
  },
  openGraph: {
    title: "opendoor — Glassdoor for Open Source Repositories",
    description: "Discover public GitHub repositories where your pull requests are welcomed, reviewed fast, and merged.",
    url: "https://opendoor.abhishekco.de",
    siteName: "opendoor",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "opendoor — Glassdoor for Open Source Repositories",
    description: "Discover public GitHub repositories where your pull requests are welcomed, reviewed fast, and merged.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "opendoor",
              "url": "https://opendoor.abhishekco.de",
              "description": "Glassdoor for open-source repositories. Objective metrics on PR merge rates and response times.",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "All"
            })
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <PostHogInit />
        {children}
      </body>
    </html>
  );
}
