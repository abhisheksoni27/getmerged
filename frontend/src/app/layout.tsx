import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "opendoor — Find repositories that welcome contributors",
  description: "Find public GitHub repositories based on merge rates, response times, and first-timer maintainer vibes.",
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
