import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Briefcase,
  Award,
  Zap,
  Lock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Hire Open Source Developers & Verified Contributors | GetMerged Talent",
  description:
    "Hire pre-vetted software engineers based on real, verified pull requests merged into top open-source repositories on GitHub. Filter by language and Karma score.",
  openGraph: {
    title: "Hire Open Source Developers & Verified Contributors | GetMerged",
    description:
      "Stop screening resume fluff. Hire engineers with proven code contributions and merged PRs in real production codebases.",
    url: "https://getmerged.abhishekco.de/talent",
    siteName: "GetMerged",
  },
};

export default function TalentPage() {
  const sampleCandidates = [
    {
      name: "Alex Rivera",
      headline: "Senior Systems Engineer · Kubernetes & Envoy Contributor",
      languages: ["Go", "C++", "Rust"],
      tier: "Tier S Verified",
      karma: "4,250 Karma",
      rank: "Level 5 Core Legend",
      merges: "14 Merged PRs in CNCF",
    },
    {
      name: "Priya Sharma",
      headline: "Fullstack Architect · Next.js & TailwindCSS Contributor",
      languages: ["TypeScript", "React", "Rust"],
      tier: "Tier S Verified",
      karma: "2,890 Karma",
      rank: "Level 4 Senior Contributor",
      merges: "9 Merged PRs in Vercel",
    },
    {
      name: "David Kim",
      headline: "Backend Engineer · Gin & Postgres Contributor",
      languages: ["Go", "SQL", "Python"],
      tier: "Tier A Verified",
      karma: "1,640 Karma",
      rank: "Level 3 Specialist",
      merges: "6 Merged PRs in Gin-Gonic",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-white font-sans dev-grid-pattern">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Hero Section */}
        <div className="rounded-3xl glass-panel border border-blue-500/30 p-8 sm:p-12 bg-gradient-to-br from-blue-950/30 via-zinc-950/80 to-zinc-900/40 shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold">
            <Briefcase className="h-4 w-4" />
            <span>Developer Talent Search</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-space tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Stop Screening Resumes. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
              Hire Developers Who Actually Ship.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            GetMerged verifies real pull requests merged into active open-source projects. Search candidate
            profiles by actual code impact, Karma reputation points, and code review track records.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/pricing?tab=recruiter"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-950/60 cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              <span>Unlock Recruiter Pass ($49/mo)</span>
            </Link>
            <Link
              href="/u/abhisheksoni"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl glass-panel border border-white/[0.14] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View Sample Candidate Profile</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 3 Core Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-3xl glass-panel border border-white/[0.08] bg-zinc-950/50 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-space text-white">
              Zero Unverifiable Claims
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Candidates are evaluated on actual GitHub commits and PR merges audited by senior open-source maintainers.
            </p>
          </div>

          <div className="p-7 rounded-3xl glass-panel border border-white/[0.08] bg-zinc-950/50 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-space text-white">
              Proof-of-Work Karma
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Filter by verified reputation score. A Level 4 engineer has proven merges across multiple audited codebases.
            </p>
          </div>

          <div className="p-7 rounded-3xl glass-panel border border-white/[0.08] bg-zinc-950/50 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-space text-white">
              Active Job Seekers Only
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Directly connect with high-signal developers who explicitly toggled <strong>&ldquo;Open to Opportunities&rdquo;</strong>.
            </p>
          </div>
        </div>

        {/* Candidate Directory Preview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold font-space text-white">
                Live Candidate Spotlight
              </h2>
              <p className="text-xs text-zinc-400 font-sans">
                Engineers actively open to senior and staff engineering roles.
              </p>
            </div>
            <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/30 flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Pass Required for Full Search
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sampleCandidates.map((c, i) => (
              <div
                key={i}
                className="p-6 rounded-3xl glass-panel border border-white/[0.08] bg-zinc-950/70 hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold font-space text-white">{c.name}</h4>
                      <p className="text-[11px] text-zinc-400 font-sans mt-0.5 line-clamp-2">{c.headline}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold shrink-0">
                      {c.tier}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {c.languages.map((l) => (
                      <span key={l} className="px-2 py-0.5 rounded-md bg-zinc-900 border border-white/[0.08] text-[10px] font-mono text-zinc-300">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/[0.08] pt-3 flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold">{c.karma}</span>
                  <span className="text-zinc-400">{c.merges}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
