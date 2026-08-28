import type { Metadata } from "next";
import { Geist, DM_Mono } from "next/font/google";
import "./globals.css";
import { PostHogInit } from "@/app/posthog-init";
import { CookieBanner } from "@/components/CookieBanner";
import { SearchProvider } from "@/context/SearchContext";
import { GlobalSearch } from "@/components/GlobalSearch";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getmerged.abhishekco.de"),
  title: "GetMerged - Find Welcoming Open Source Repositories | C-Rank™",
  description: "Find GitHub repositories that welcome open source contribution, ranked by PR merge rates, maintainer response time, and first-timer success.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
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
      "application/atom+xml": "https://getmerged.abhishekco.de/feeds/top.xml",
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
    <html lang="en" className={`${geist.variable} ${dmMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-[#fafafa] selection:bg-[#ff6b00]/30 selection:text-white">
        <PostHogInit />
        <SearchProvider>
          {children}
          <GlobalSearch />
        </SearchProvider>
        <CookieBanner />
      </body>
    </html>
  );
}
