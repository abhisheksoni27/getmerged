import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { PostHogInit } from "@/app/posthog-init";
import { CookieBanner } from "@/components/CookieBanner";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getmerged.abhishekco.de"),
  title: "GetMerged - Find Welcoming GitHub Repos for Open Source Contribution | C-Rank™",
  description: "Stop guessing which door is open. Find GitHub repositories that welcome open source contribution, ranked by PR merge rates, maintainer response time, and first-timer success. The C-Rank™ index for developers building their github profile.",
  keywords: [
    "open source contribution",
    "good first issue",
    "github repositories",
    "github profile",
    "developer portfolio",
    "ai software development",
    "contributor friendly",
    "c-rank",
    "pull request merge rate",
    "maintainer response time",
    "first timer issues",
    "open source software",
    "github actions",
    "backend development",
    "software development best practices",
  ],
  alternates: {
    canonical: "https://getmerged.abhishekco.de",
    types: {
      "application/xml": "https://getmerged.abhishekco.de/sitemap.xml",
    },
  },
  openGraph: {
    title: "GetMerged - Find Welcoming GitHub Repos for Open Source Contribution",
    description: "Find GitHub repositories that welcome open source contribution, ranked by PR merge rates, maintainer response time, and first-timer success.",
    url: "https://getmerged.abhishekco.de",
    siteName: "GetMerged",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "GetMerged - Find Welcoming GitHub Repos for Open Source Contribution",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GetMerged - Find Welcoming GitHub Repos for Open Source Contribution",
    description: "Find GitHub repositories that welcome open source contribution, ranked by PR merge rates, maintainer response time, and first-timer success.",
    images: ["/opengraph-image"],
  },
  verification: {
    google: "42ybYiZ5j48J-hBO7WpyqVPHY7TWMeC1nbiakdAbiuY",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} ${dmMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <PostHogInit />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
