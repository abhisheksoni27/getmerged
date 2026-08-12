import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { PostHogInit } from "@/app/posthog-init";

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
  metadataBase: new URL("https://opendoor.abhishekco.de"),
  title: "opendoor - Glassdoor for Open Source Repositories | C-Rank™ Index",
  description: "Stop guessing which door is open. Discover public GitHub repositories where your pull requests are welcomed, reviewed fast, and merged.",
  keywords: [
    "open source",
    "github repositories",
    "first timer issues",
    "contributor friendly",
    "c-rank",
    "pull request merge rate",
    "maintainer response time",
    "open source contribution",
  ],
  alternates: {
    canonical: "https://opendoor.abhishekco.de",
  },
  openGraph: {
    title: "opendoor - Glassdoor for Open Source Repositories",
    description: "Discover public GitHub repositories where your pull requests are welcomed, reviewed fast, and merged.",
    url: "https://opendoor.abhishekco.de",
    siteName: "opendoor",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "opendoor - Glassdoor for Open Source Repositories",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "opendoor - Glassdoor for Open Source Repositories",
    description: "Discover public GitHub repositories where your pull requests are welcomed, reviewed fast, and merged.",
    images: ["/opengraph-image"],
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
      </body>
    </html>
  );
}
