import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { Trophy, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { LangLogo } from "@/components/LangLogo";

export const metadata: Metadata = {
  title: "Open Source Ecosystem Rankings (C-Rank™) - Opendoor",
  description: "Browse repository contributor-friendliness rankings by programming language and ecosystem. Find welcoming GitHub repos across Python, TypeScript, Go, Rust, C#, and more.",
  alternates: {
    canonical: "https://opendoor.abhishekco.de/rankings",
  },
  openGraph: {
    title: "Open Source Ecosystem Rankings - Opendoor",
    description: "Explore top welcoming open-source repositories ranked by programming language and C-Rank™ telemetry.",
    url: "https://opendoor.abhishekco.de/rankings",
    siteName: "Opendoor",
  },
};

export default function RankingsIndexPage() {
  const ecosystems = [
    { name: "Python", slug: "python", desc: "Fast-merging data science, web, and AI open-source libraries." },
    { name: "TypeScript", slug: "typescript", desc: "Top frontend and fullstack repositories with active maintainers." },
    { name: "Go", slug: "go", desc: "Cloud-native, Kubernetes, and backend infrastructure tooling." },
    { name: "Rust", slug: "rust", desc: "High-performance systems programming and CLI utilities." },
    { name: "C#", slug: "csharp", desc: "Modern .NET, game development, and enterprise applications." },
    { name: "C++", slug: "cpp", desc: "Game engines, graphics, and performance-critical systems." },
    { name: "Java", slug: "java", desc: "Distributed systems, backend services, and Android tools." },
    { name: "PHP", slug: "php", desc: "Modern PHP, Laravel, and Symfony open-source packages." },
    { name: "Ruby", slug: "ruby", desc: "Ruby on Rails ecosystem, developer tools, and gems." },
    { name: "Swift", slug: "swift", desc: "iOS, macOS, and cross-platform Swift developer packages." },
    { name: "Kotlin", slug: "kotlin", desc: "Android and multiplatform Kotlin developer repositories." },
    { name: "Dart", slug: "dart", desc: "Flutter mobile, desktop, and web component packages." },
    { name: "Elixir", slug: "elixir", desc: "Phoenix framework, distributed computing, and OTP apps." },
    { name: "Zig", slug: "zig", desc: "Next-generation systems software and lightweight tooling." },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6] dev-grid-pattern">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full text-zinc-800 font-sans">
        <Link
          href="/"
          title="Return to Opendoor Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-600 hover:text-zinc-900 transition-colors mb-6 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        <div className="rounded-3xl bg-white p-6 sm:p-10 border border-zinc-200/80 shadow-xs mb-10">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1 text-xs font-semibold text-white font-mono shadow-xs">
              <Trophy className="h-3.5 w-3.5 text-amber-400" /> Ecosystem Directory
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight font-space">
            Open Source Ecosystem Rankings
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed font-sans">
            Explore contributor-friendly repositories grouped by language. Each ecosystem is scored with live GitHub PR telemetry, maintainer responsiveness, and first-timer acceptance rates.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between border-b border-zinc-200 pb-4">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 font-space">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Ranked Ecosystems ({ecosystems.length})
          </h2>
          <span className="text-xs text-zinc-500 font-mono">Live Telemetry Index</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {ecosystems.map((eco) => (
            <Link
              key={eco.slug}
              href={`/rankings/${eco.slug}`}
              className="group rounded-2xl bg-white p-6 border border-zinc-200/80 shadow-xs hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center shrink-0">
                    <LangLogo language={eco.name} />
                  </div>
                  <div>
                    <h3 className="font-space text-lg font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors">
                      {eco.name}
                    </h3>
                    <span className="text-[11px] font-mono text-zinc-400">/rankings/{eco.slug}</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed font-sans">
                  {eco.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-mono font-semibold text-zinc-900 group-hover:text-zinc-700">
                <span>View ranked repos</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
