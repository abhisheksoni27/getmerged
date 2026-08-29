import type { Metadata } from "next";
import { Inter, DM_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { PostHogInit } from "@/app/posthog-init";
import { CookieBanner } from "@/components/CookieBanner";
import { SearchProvider } from "@/context/SearchContext";
import { GlobalSearch } from "@/components/GlobalSearch";
import { PhysicsCanvas } from "@/components/PhysicsCanvas";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
});

const spaceGrotesk = Space_Grotesk({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-space-grotesk",
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
    <html lang="en" className={`${inter.variable} ${dmMono.variable} ${spaceGrotesk.variable} h-full antialiased dark`}>
      <head>
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-[#fafafa] selection:bg-[#ff6b00]/30 selection:text-white relative">
        {/* Global spatial background dot-grid texture */}
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-20 bg-dot-grid opacity-30 mask-radial-faded" />
        
        {/* Interactive physics node canvas */}
        <PhysicsCanvas />

        {/* Global atmospheric ambient glow orbs */}
        <div aria-hidden="true" className="fixed top-0 left-1/2 -translate-x-1/2 -z-10 pointer-events-none w-[900px] h-[400px] max-w-full opacity-40 blur-[120px] bg-gradient-to-b from-emerald-500/10 via-amber-500/5 to-transparent" />
        <div aria-hidden="true" className="fixed bottom-0 right-0 -z-10 pointer-events-none w-[500px] h-[300px] max-w-full opacity-25 blur-[100px] bg-gradient-to-t from-violet-500/10 to-transparent" />

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
