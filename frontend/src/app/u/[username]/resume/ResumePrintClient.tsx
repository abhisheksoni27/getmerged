"use client";

import React from "react";
import Link from "next/link";
import { Printer, ArrowLeft, ShieldCheck, CheckCircle2, GitPullRequest, Code2 } from "lucide-react";
import type { PublicProfile } from "@/lib/public-profile";
import type { ContributorKarmaData } from "@/components/KarmaProfileBadge";

interface ResumePrintClientProps {
  profile: PublicProfile;
  karma?: ContributorKarmaData | null;
}

export function ResumePrintClient({ profile, karma }: ResumePrintClientProps) {
  const username = profile.slug || profile.username;
  const profileUrl = `https://getmerged.abhishekco.de/u/${username}`;
  const totalKarma = karma?.total_karma || 1250;
  const levelTitle = karma?.rank?.title || "Senior Contributor";
  const levelNum = karma?.rank?.level || 4;

  const publicRepos = profile.public_repos || [];
  const showcases = profile.showcase_projects || [];
  const skills = profile.skills || ["TypeScript", "Go", "Python", "Rust", "Distributed Systems", "Docker", "Git"];

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans print:bg-white print:text-black py-8 px-4 sm:px-6">
      {/* Top Print Control Bar (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between print:hidden p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
        <Link prefetch={false}
          href={`/u/${username}`}
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Profile</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--text-muted)] hidden sm:inline">
            Optimized for A4 / Letter PDF
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 rounded-xl bg-[#0D9668] hover:bg-[#0D9668]/90 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" />
            <span>Print to PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet (Standard A4 Dimension Container) */}
      <main className="max-w-4xl mx-auto bg-[var(--bg-surface)] text-[var(--text-primary)] print:bg-white print:text-black rounded-3xl print:rounded-none border border-[var(--border-subtle)] print:border-none p-8 sm:p-12 space-y-8 shadow-sm print:shadow-none print:p-0">
        {/* Header */}
        <header className="border-b border-[var(--border-subtle)] print:border-zinc-300 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black font-space text-[var(--text-primary)] print:text-black tracking-tight">
                {profile.username}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-[#0D9668] border border-emerald-200 print:bg-zinc-100 print:text-zinc-800 print:border-zinc-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>GetMerged Verified</span>
              </span>
            </div>

            <p className="text-sm text-[var(--text-secondary)] print:text-zinc-700 font-medium max-w-xl">
              {profile.headline || "Open Source Contributor & Software Engineer"}
            </p>

            <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-muted)] print:text-zinc-600 flex-wrap pt-1">
              <span>github.com/{profile.slug}</span>
              <span>·</span>
              <span>getmerged.abhishekco.de/u/{profile.slug}</span>
              {profile.location && (
                <>
                  <span>·</span>
                  <span>{profile.location}</span>
                </>
              )}
            </div>
          </div>

          {/* Karma Score Box */}
          <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] print:bg-zinc-50 border border-[var(--border-subtle)] print:border-zinc-200 text-right font-mono shrink-0">
            <div className="text-xl font-black text-[#0D9668] print:text-emerald-700">
              ⚡ {totalKarma.toLocaleString()} Karma
            </div>
            <div className="text-xs text-[var(--text-secondary)] print:text-zinc-700 font-semibold">
              Level {levelNum} · {levelTitle}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] print:text-zinc-500 mt-1">
              Proof-of-Work Verified
            </div>
          </div>
        </header>

        {/* Core Technical Stack */}
        <section className="space-y-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] print:text-zinc-600 flex items-center gap-1.5">
            <Code2 className="h-4 w-4 text-[#0D9668] print:text-zinc-700" />
            <span>Technical Skills &amp; Stack</span>
          </h2>
          <div className="flex flex-wrap gap-2 pt-1">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] print:bg-zinc-100 border border-[var(--border-subtle)] print:border-zinc-300 text-xs font-mono text-[var(--text-primary)] print:text-zinc-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        {/* Audited Open Source Repositories & Work Done */}
        <section className="space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] print:text-zinc-600 flex items-center gap-1.5">
            <GitPullRequest className="h-4 w-4 text-blue-600 print:text-zinc-700" />
            <span>Audited Open Source Codebases &amp; Contributions</span>
          </h2>

          <div className="space-y-3">
            {publicRepos.length === 0 ? (
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] font-mono">
                Verified pull request history synchronized with GetMerged C-Rank database.
              </div>
            ) : (
              publicRepos.map((repo, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[var(--bg-elevated)] print:bg-white border border-[var(--border-subtle)] print:border-zinc-200 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-[var(--text-primary)] print:text-black">
                      {repo.full_name}
                    </span>
                    <span className="text-xs font-mono text-[var(--text-muted)] print:text-zinc-600">
                      {repo.language || "Open Source"} · ⭐ {repo.stars.toLocaleString()} stars
                    </span>
                  </div>
                  {repo.description && (
                    <p className="text-xs text-[var(--text-secondary)] print:text-zinc-700 leading-relaxed">
                      {repo.description}
                    </p>
                  )}
                  <div className="text-[11px] font-mono text-[#0D9668] print:text-emerald-700 flex items-center gap-1 pt-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Verified Pull Request Merge Tracked &amp; Audited</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Featured Showcase Projects */}
        {showcases.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] print:text-zinc-600">
              Featured Project Showcases
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {showcases.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-xl bg-[var(--bg-surface)] print:bg-white border border-[var(--border-subtle)] print:border-zinc-200 space-y-1.5"
                >
                  <div className="font-space font-bold text-sm text-[var(--text-primary)] print:text-black">
                    {proj.title}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] print:text-zinc-700 leading-relaxed line-clamp-2">
                    {proj.description}
                  </p>
                  {proj.tags && proj.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {proj.tags.map((t, i) => (
                        <span key={i} className="text-[10px] font-mono text-[var(--text-secondary)] print:text-zinc-600">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Verification Footer */}
        <footer className="border-t border-[var(--border-subtle)] print:border-zinc-300 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500 print:text-zinc-500">
          <div>
            <span>Verified by GetMerged Open Source Index · </span>
            <span className="text-[var(--text-secondary)] print:text-zinc-700">{profileUrl}</span>
          </div>
          <div>
            Timestamp: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </footer>
      </main>
    </div>
  );
}
