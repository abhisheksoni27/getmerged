import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getEvaluation, validateReferrerId } from "@/lib/pr-eval-store";
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight, GitPullRequest, ExternalLink, ShieldCheck } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const sParams = await searchParams;
  const stored = getEvaluation(id);

  const repo = stored?.repo || (typeof sParams.repo === "string" ? sParams.repo : "Open Source Repository");
  const score = stored?.score !== undefined ? stored.score : (typeof sParams.score === "string" ? parseFloat(sParams.score) : 75);
  const verdict = stored?.verdict || (typeof sParams.verdict === "string" ? sParams.verdict : "PRE-FLIGHT READY");

  const ogUrl = `/api/og/pr-eval/${encodeURIComponent(id)}?repo=${encodeURIComponent(repo)}&score=${score}&verdict=${encodeURIComponent(verdict)}`;

  return {
    title: `PR Evaluation (${score}/100) - ${repo} | GetMerged`,
    description: `Preflight PR evaluation results and contributor readiness score for ${repo}. Verdict: ${verdict}.`,
    openGraph: {
      title: `PR Evaluation (${score}/100) - ${repo}`,
      description: `Preflight PR evaluation results: ${verdict}`,
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `PR Evaluation for ${repo}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `PR Evaluation (${score}/100) - ${repo}`,
      description: `Preflight PR evaluation results: ${verdict}`,
      images: [ogUrl],
    },
  };
}

export default async function SharePREvalPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sParams = await searchParams;

  const stored = getEvaluation(id);

  // Fallback to query params if KV was cold or across serverless instances
  const repo = stored?.repo || (typeof sParams.repo === "string" ? sParams.repo : null);
  if (!repo) {
    notFound();
  }

  const score = stored?.score !== undefined ? stored.score : (typeof sParams.score === "string" ? parseFloat(sParams.score) : 0);
  const verdict = stored?.verdict || (typeof sParams.verdict === "string" ? sParams.verdict : (score >= 70 ? "PRE-FLIGHT READY" : "ADJUSTMENTS RECOMMENDED"));
  const prNumber = stored?.pr_number ?? (typeof sParams.pr_number === "string" ? parseInt(sParams.pr_number, 10) : null);
  
  const rawRef = stored?.referrer_id || (typeof sParams.ref === "string" ? sParams.ref : null) || (typeof sParams.referrer_id === "string" ? sParams.referrer_id : null);
  const validatedReferrerId = validateReferrerId(rawRef);

  const isReady = verdict.toUpperCase().includes("READY");

  const repoClean = repo.replace(/^https?:\/\/github\.com\//i, "").trim();
  const cRankUrl = `/${repoClean}${validatedReferrerId ? `?ref=${encodeURIComponent(validatedReferrerId)}` : ""}`;
  const preflightCtaUrl = `/preflight?repo=${encodeURIComponent(repoClean)}${validatedReferrerId ? `&ref=${encodeURIComponent(validatedReferrerId)}` : ""}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-zinc-900 font-sans">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Breadcrumb / Top tag */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Public PR Pre-Flight Verification</span>
          </div>

          <Link
            href={cRankUrl}
            className="text-xs font-mono font-bold text-zinc-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
          >
            <span>View {repoClean} C-Rank</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Main Result Card */}
        <div className="rounded-2xl bg-white p-6 sm:p-8 border-2 border-brand-dark shadow-[6px_6px_0px_#222831] mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-zinc-100">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                Target Repository
              </span>
              <h1 className="text-2xl sm:text-3xl font-black font-space text-zinc-900 break-words">
                {repoClean}
              </h1>
              {prNumber && (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-zinc-600">
                  <GitPullRequest className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Pull Request #{prNumber}</span>
                </div>
              )}
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 bg-zinc-50 sm:bg-transparent p-4 sm:p-0 rounded-xl border sm:border-0 border-zinc-200">
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-zinc-900">
                {Math.round(score)}
                <span className="text-lg sm:text-xl text-zinc-400 font-normal">/100</span>
              </div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                Pre-Flight Score
              </div>
            </div>
          </div>

          <div className="pt-6">
            <div className="mb-4">
              <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                Evaluation Verdict
              </span>
              <div className="inline-flex items-center gap-2">
                {isReady ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {verdict}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    {verdict}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-zinc-700 leading-relaxed font-sans mb-6">
              {isReady
                ? "This pull request successfully met all static quality checks, convention tests, and merge readiness heuristics for this repository."
                : "This pull request has recommendations for improving changeset scope, test coverage, or conventional naming prior to maintainer review."}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-zinc-100">
              <Link
                href={preflightCtaUrl}
                data-testid="share-cta-preflight"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-dark text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-[2px_2px_0px_#000]"
              >
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>Test Your Own PR Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href={cRankUrl}
                data-testid="share-cta-crank"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border-2 border-brand-dark text-zinc-900 font-mono font-bold text-xs uppercase tracking-wider hover:bg-zinc-50 active:scale-[0.98] transition-all shadow-[2px_2px_0px_#000]"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Explore {repoClean} C-Rank</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Referral info banner if validated referrer exists */}
        {validatedReferrerId && (
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs font-mono text-emerald-900 flex items-center justify-between">
            <span>🎁 Referral credit attached: You get 3 bonus PR evaluations upon signing up!</span>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
