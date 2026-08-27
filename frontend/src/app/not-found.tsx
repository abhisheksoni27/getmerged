import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowLeft, Search, ShieldAlert } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Repository Not Found | GetMerged",
  description: "The requested repository or page is not tracked in the GetMerged open-source index.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-black text-white">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-xl w-full glass-panel border border-white/[0.12] p-8 sm:p-10 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#ffb3c7] border border-white/[0.12] shadow-sm mb-6">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>

          <div className="inline-block px-3 py-1 bg-[#ffd93d] border border-white/[0.12] font-mono text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            HTTP 404 &middot; Not Indexed
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Repository Not Found
          </h1>

          <p className="text-zinc-300 text-sm sm:text-base leading-relaxed mb-8">
            This repository has not been indexed or does not meet the minimum public contribution telemetry thresholds on GitHub.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/"
              title="Return to GetMerged Home"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-mono text-sm font-bold border border-white/[0.12] shadow-sm hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Explore Welcoming Repos
            </Link>

            <Link
              href="/repos"
              title="Search all indexed repositories"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-mono text-sm font-bold border border-white/[0.12] shadow-sm hover:bg-[#a6cbff] transition-colors"
            >
              <Search className="w-4 h-4" />
              Browse Repository Directory
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
