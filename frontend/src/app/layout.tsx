import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://opendoor.abhishekco.de"),
  title: "opendoor — Find repositories that welcome contributors",
  description: "Find public GitHub repositories based on merge rates, response times, and first-timer maintainer vibes.",
  keywords: ["open source", "github repositories", "first timer issues", "contributor friendly", "c-rank", "pull request merge rate", "maintainer response time"],
  openGraph: {
    title: "opendoor — Find repositories that welcome contributors",
    description: "Find public GitHub repositories based on merge rates, response times, and first-timer maintainer vibes.",
    url: "https://opendoor.abhishekco.de",
    siteName: "opendoor",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "opendoor — Find repositories that welcome contributors",
    description: "Find public GitHub repositories based on merge rates, response times, and first-timer maintainer vibes.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-zinc-900">{children}</body>
    </html>
  );
}
