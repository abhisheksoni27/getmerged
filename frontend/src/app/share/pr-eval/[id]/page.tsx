import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getEvaluation, validateReferrerId } from "@/lib/pr-eval-store";
import { getEvalOutcome } from "@/lib/eval-outcome-client";
import { formatVerdict, formatAccuracy } from "@/lib/pr-verdict";
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight, GitPullRequest, ExternalLink, ShieldCheck, XCircle, Hourglass } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// AC6: shared pages use a short 60s revalidate so verdicts track the backend
// sync cadence (15 min max staleness) without hammering the outcome API.
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const stored = getEvaluation(id);
  const outcome = await getEvalOutcome(id);

  const repo = stored?.repo || "Open Source Repository";
  const score = stored?.score !== undefined ? stored.score : 75;
  const verdict = stored?.verdict || "PRE-FLIGHT READY";
  const verdictView = formatVerdict(outcome);

  // ?v=<outcome_hash> busts CDN caches when a new verdict lands (AC5/AC6).
  const ogUrl = `/api/og/pr-eval/${encodeURIComponent(id)}?repo=${encodeURIComponent(repo)}&score=${score}&verdict=${encodeURIComponent(verdict)}&v=${encodeURIComponent(outcome?.outcome_hash || "0")}`;
  const description = verdictView
    ? `Preflight PR evaluation results for ${repo}. Verdict: ${verdict}. Outcome: ${verdictView.text}`
    : `Preflight PR evaluation results and contributor readiness score for ${repo}. Verdict: ${verdict}.`;

  return {
    title: `PR Evaluation (${score}/100) - ${repo} | GetMerged`,
    description,
    openGraph: {
      title: `PR Evaluation (${score}/100) - ${repo}`,
      description,
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
      description,
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

  // Verified outcome (AC1-AC4): null degrades to the static snapshot with
  // 'Outcome unavailable' - no crash, no wrong data.
  const outcome = await getEvalOutcome(id);
  const verdictView = formatVerdict(outcome);
  const accuracyView = formatAccuracy(outcome);

  const repoClean = repo.replace(/^https?:\/\/github\.com\//i, "").trim();
  const cRankUrl = `/${repoClean}${validatedReferrerId ? `?ref=${encodeURIComponent(validatedReferrerId)}` : ""}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-white font-sans">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Breadcrumb / Top tag */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-emerald-300 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Public PR Pre-Flight Verification</span>
          </div>

          <Link
            href={cRankUrl}
            className="text-xs font-mono font-bold text-zinc-300 hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            <span>View {repoClean} C-Rank</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Main Result Card */}
        <div className="rounded-2xl glass-panel p-6 sm:p-8 border-2 border-white/[0.1] shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/[0.1]">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 block mb-1">
                Target Repository
              </span>
              <h1 className="text-2xl sm:text-3xl font-black font-space text-white break-words">
                {repoClean}
              </h1>
              {prNumber && (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-zinc-300">
                  <GitPullRequest className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Pull Request #{prNumber}</span>
                </div>
              )}
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 glass-card sm:bg-transparent p-4 sm:p-0 rounded-xl border sm:border-0 border-white/[0.1]">
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white">
                {Math.round(score)}
                <span className="text-lg sm:text-xl text-zinc-300 font-normal">/100</span>
              </div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-300">
                Pre-Flight Score
              </div>
            </div>
          </div>

          <div className="pt-6">
            <div className="mb-4">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                Evaluation Verdict
              </span>
              <div className="inline-flex items-center gap-2">
                {isReady ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 border border-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {verdict}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono bg-amber-500/15 border border-amber-500/30 text-amber-300 border border-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    {verdict}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed font-sans mb-6">
              {isReady
                ? "This pull request successfully met all static quality checks, convention tests, and merge readiness heuristics for this repository."
                : "This pull request has recommendations for improving changeset scope, test coverage, or conventional naming prior to maintainer review."}
            </p>

            {/* Verified Outcome (AC1): live verdict synced from the PR tracker */}
            <div className="mb-6 p-4 rounded-xl glass-card border border-white/[0.1]" data-testid="verified-outcome">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                Verified Outcome
              </span>
              {verdictView ? (
                <>
                  <div className="inline-flex items-center gap-2">
                    {verdictView.tone === "good" && (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 border border-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        {verdictView.text}
                      </span>
                    )}
                    {verdictView.tone === "bad" && (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono bg-red-100 text-red-800 border border-red-300">
                        <XCircle className="h-4 w-4 text-red-600" />
                        {verdictView.text}
                      </span>
                    )}
                    {verdictView.tone === "muted" && (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono glass-card text-zinc-300 border border-white/[0.12]">
                        <Hourglass className="h-4 w-4 text-zinc-300" />
                        {verdictView.text}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-zinc-300">
                    {outcome?.creator_login && (
                      <span className="mr-2">@{outcome.creator_login}</span>
                    )}
                    {accuracyView ? accuracyView.label : " - "}
                  </div>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono glass-card text-zinc-300 border border-white/[0.12]">
                  Outcome unavailable
                </span>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-white/[0.1]">
              <Link
                href={cRankUrl}
                data-testid="share-cta-crank"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-dark text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-sm"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Explore {repoClean} C-Rank</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Referral info banner if validated referrer exists */}
        {validatedReferrerId && (
          <div className="p-4 rounded-xl bg-emerald-950/70 border-emerald-800/80/70 border border-emerald-200 text-xs font-mono text-emerald-300 flex items-center justify-between">
            <span>🎁 Referral credit attached: You get 3 bonus PR evaluations upon signing up!</span>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
