"use client";

import React, { useState } from "react";
import { Repo, AIInsights, GoodFirstIssueItem, PRSizeSweetSpotData } from "@/types/opendoor";
import {
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import posthog from "posthog-js";
import { RepoDetailHero } from "@/components/RepoDetailHero";
import { RepoScorecards } from "@/components/RepoScorecards";
import { RepoBadgeGenerator } from "@/components/RepoBadgeGenerator";
import { SimilarRepos } from "@/components/SimilarRepos";
import { RepoTrendChart } from "@/components/RepoTrendChart";
import { PRAcceptanceWidget } from "@/components/PRAcceptanceWidget";
import { OptimalReviewWindow } from "@/components/OptimalReviewWindow";
import { PRSizeSweetSpotCard } from "@/components/PRSizeSweetSpotCard";
import { UnscoredExplainer } from "@/components/UnscoredExplainer";
import { RaiseYourRank } from "@/components/RaiseYourRank";
import { RepoStickyBar } from "@/components/RepoStickyBar";

const AuthModal = dynamic(() => import("@/components/AuthModal").then((mod) => mod.AuthModal), { ssr: false });
const MaintainerConsoleModal = dynamic(() => import("@/components/MaintainerConsoleModal").then((mod) => mod.MaintainerConsoleModal), { ssr: false });
const DisputeModal = dynamic(() => import("@/components/DisputeModal").then((mod) => mod.DisputeModal), { ssr: false });
import { RepoAuditCTA } from "@/components/RepoAuditCTA";
import { isRepoScored } from "@/lib/repo-metadata";


import { PRLikelihoodData } from "@/components/PRAcceptanceWidget";
import { OptimalTimeResult } from "@/types/opendoor";
import { TrendPoint } from "@/components/RepoTrendChart";
import { useRepoDetail } from "@/components/repo-detail/useRepoDetail";
import { WidgetSection } from "@/components/repo-detail/WidgetSection";
import { RepoDetailSkeleton } from "@/components/repo-detail/RepoDetailSkeleton";
import { GithubNotFoundView, IndexingView } from "@/components/repo-detail/NotFoundView";
import { InsightsSection } from "@/components/repo-detail/InsightsSection";
import { GfiSection } from "@/components/repo-detail/GfiSection";
import { FeedbackSection } from "@/components/repo-detail/FeedbackSection";
import { FaqGuide } from "@/components/repo-detail/FaqGuide";

interface ClientRepoDetailProps {
  repo: Repo | null;
  fullName: string;
  initialInsights?: AIInsights | null;
  initialRelatedRepos?: Repo[];
  initialGfiList?: GoodFirstIssueItem[];
  initialSweetSpot?: PRSizeSweetSpotData | null;
  initialLikelihood?: PRLikelihoodData | null;
  initialOptimalTime?: OptimalTimeResult | null;
  initialTrend?: TrendPoint[] | null;
  initialClaimStatus?: { is_claimed?: boolean; is_verified?: boolean } | null;
}

export function ClientRepoDetail({
  repo,
  fullName,
  initialInsights,
  initialRelatedRepos = [],
  initialGfiList = [],
  initialSweetSpot = null,
  initialLikelihood = null,
  initialOptimalTime = null,
  initialTrend = null,
  initialClaimStatus = null,
}: ClientRepoDetailProps) {
  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalConfig, setAuthModalConfig] = useState<{ title?: string; description?: string; source?: string }>({});

  // Maintainer Console Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Score Dispute Modal State
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

  const openAuthModal = (title?: string, description?: string, source = "modal") => {
    setAuthModalConfig({ title, description, source });
    setIsAuthModalOpen(true);
  };

  const {
    currentUser,
    insights,
    isWatching,
    watchLoading,
    githubNotFound,
    isCheckingGithub,
    relatedRepos,
    gfiList,
    gfiTab,
    setGfiTab,
    isRepoClaimed,
    setIsRepoClaimed,
    isRepoVerified,
    setIsRepoVerified,
    isLoggedIn,
    rank,
    score,
    handleWatchToggle,
    responseTimeStr,
    responseCommentary,
    mergeRateStr,
    mergeCommentary,
    firstTimerSuccessStr,
    firstTimerCommentary,
    vibeScore,
    busFactor,
    maintainersCommentary,
    getRankHumanLabel,
    tabs,
    activeSection,
    showSticky,
    scrollToSection,
  } = useRepoDetail({
    repo,
    fullName,
    initialInsights,
    initialRelatedRepos,
    initialGfiList,
    initialClaimStatus,
    onRequireAuth: openAuthModal,
  });

  const handleClaimClick = () => {
    if (!isLoggedIn) {
      openAuthModal(
        "Claim Repository Ownership",
        "Sign in with GitHub to verify maintainer status and unlock the C-Rank Console.",
        "claim"
      );
      return;
    }
    setIsClaimModalOpen(true);
  };

  if (isCheckingGithub) {
    return <RepoDetailSkeleton />;
  }

  if (!repo) {
    if (githubNotFound) {
      return <GithubNotFoundView fullName={fullName} />;
    }

    return (
      <IndexingView
        fullName={fullName}
        isLoggedIn={isLoggedIn}
        isWatching={isWatching}
        watchLoading={watchLoading}
        onWatchToggle={handleWatchToggle}
        onRequireAuth={openAuthModal}
      />
    );
  }

  return (
    <>
      {/* Sticky Header with Scrollspy Section Tabs */}
      <RepoStickyBar
        fullName={fullName}
        repo={repo}
        rank={rank}
        rankLabel={getRankHumanLabel(rank)}
        isWatching={isWatching}
        watchLoading={watchLoading}
        onWatchToggle={handleWatchToggle}
        activeSection={activeSection}
        onSectionClick={scrollToSection}
        tabs={tabs}
        visible={showSticky}
      />

      <main className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-6 flex-1 w-full overflow-hidden">
        {/* Navigation Breadcrumb */}
        <Link prefetch={false}
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 text-xs font-sans text-zinc-300 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Explorer
        </Link>

        {/* Section 1: Overview & Hero */}
        <section id="overview" className="scroll-mt-36 mb-6">
          {/* Hero Header */}
          <RepoDetailHero
            fullName={fullName}
            repo={repo}
            rank={rank}
            rankLabel={getRankHumanLabel(rank)}
            score={score}
            isWatching={isWatching}
            watchLoading={watchLoading}
            isClaimed={isRepoClaimed}
            isVerified={isRepoVerified}
            onClaimClick={handleClaimClick}
            onDisputeClick={() => setIsDisputeModalOpen(true)}
            onWatchToggle={handleWatchToggle}
            onGithubClick={() => posthog.capture('repo_github_link_clicked', { repo_full_name: fullName, repo_tier: rank })}
          />

          {/* In-Page Quick Navigation Tabs Bar */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2 px-1 mb-2">
            <span className="text-xs font-mono text-zinc-300 font-bold shrink-0 mr-1 flex items-center gap-1">
              Jump to:
            </span>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => scrollToSection(tab.id)}
                  title={`Scroll to ${tab.label}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 cursor-pointer border border-white/[0.12] ${
                    isActive
                      ? "glass-card text-white shadow-sm"
                      : "glass-panel text-zinc-200 hover:bg-slate-800 hover:shadow-sm"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-zinc-300"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </section>

      {/* Maintainer Console Modal (AC1 & AC6) */}
      <MaintainerConsoleModal
        fullName={fullName}
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        isInitiallyVerified={isRepoVerified}
        onVerificationSuccess={() => {
          setIsRepoClaimed(true);
          setIsRepoVerified(true);
        }}
      />

      {/* Score Dispute Modal with 48h SLA */}
      <DisputeModal
        fullName={fullName}
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
      />

      {/* Unscored explainer + verified-welcoming alternatives (IDEA-20260820-02 AC2) */}
      {!isRepoScored(repo) && (
        <UnscoredExplainer fullName={fullName} language={repo?.language} />
      )}

      {/* One-Time $19 Repo Deep-Audit CTA (AC2/AC5): shown only for scored repos
          the viewer has not yet purchased; hidden once paid. Unauthenticated
          clicks force signup/login, then the audit page drives checkout. */}
      {isRepoScored(repo) && (
        <div className="mb-8">
          <RepoAuditCTA
            fullName={fullName}
            isScored={isRepoScored(repo)}
            isLoggedIn={isLoggedIn}
            requireLogin={() =>
              openAuthModal(
                "Unlock the Full Deep-Audit",
                "Sign in to purchase the one-time $19 repo deep-audit with the full C-Rank breakdown, peer percentiles and AI-prioritized fixes.",
                "audit"
              )
            }
          />
        </div>
      )}

      {/* Raise Your C-Rank playbook: quantified gaps from live telemetry,
          fed by README badge/link traffic into the claim flow */}
      {isRepoScored(repo) && (
        <RaiseYourRank fullName={fullName} onClaimClick={handleClaimClick} />
      )}

      {/* AI Insights & Maintainer Review Guidelines - moved up per Issue #80 */}
      <InsightsSection insights={insights} fullName={fullName} />

      {/* Scorecards & Macro Metrics */}
      <section id="scorecards" className="scroll-mt-36 space-y-8 mb-10">
        <RepoScorecards
          responseTimeStr={responseTimeStr}
          responseCommentary={responseCommentary}
          mergeRateStr={mergeRateStr}
          mergeCommentary={mergeCommentary}
          firstTimerSuccessStr={firstTimerSuccessStr}
          firstTimerCommentary={firstTimerCommentary}
          busFactor={busFactor}
          maintainersCommentary={maintainersCommentary}
          vibeScore={vibeScore}
          onboardingScore={repo?.onboarding_score}
          score={score}
          rank={rank}
        />

        {/* Interactive README C-Rank Live Badge Generator (Issue #50) */}
        <RepoBadgeGenerator fullName={fullName} />
      </section>

      {/* Trends & Forecasts */}
      <section id="trends" className="scroll-mt-36 space-y-8 mb-10">
        {/* C-Rank Trend */}
        <RepoTrendChart repoId={fullName} initialTrend={initialTrend} />

        {/* PR Acceptance & Review Speed Forecast Widget (Epic 3, Story 3.4) */}
        {fullName && (() => {
          const [owner, name] = fullName.split("/");
          if (!owner || !name) return null;
          return <PRAcceptanceWidget owner={owner} name={name} initialData={initialLikelihood} />;
        })()}

        {/* Optimal PR Submission Window & Maintainer Activity Heatmap (Story 7.1 / IDEA-20260819-01) */}
        <OptimalReviewWindow fullName={fullName} initialData={initialOptimalTime} />

        {/* PR Velocity Sweet Spot Benchmark (Story 2.1) */}
        <PRSizeSweetSpotCard
          repoId={repo?.id ? String(repo.id) : fullName}
          repoFullName={fullName}
          initialData={initialSweetSpot}
        />
      </section>

      {/* Similar Repositories & Alternatives Interlinking (Issue #55) */}
      <WidgetSection id="alternatives" show={relatedRepos.length > 0} className="scroll-mt-36 mb-10">
        <SimilarRepos relatedRepos={relatedRepos} language={repo?.language} />
      </WidgetSection>

      {/* Good First Issues Cards (Story 10.2 & Story 10.3) */}
      <GfiSection
        repo={repo}
        fullName={fullName}
        gfiList={gfiList}
        gfiTab={gfiTab}
        onTabChange={setGfiTab}
      />

      {/* Issues #6, #7, #8: Contributor Community Feedback & Verification Module */}
      <FeedbackSection
        repoId={repo?.id}
        fullName={fullName}
        currentUser={currentUser}
        isLoggedIn={isLoggedIn}
        onRequireAuth={openAuthModal}
      />

      {/* Content-Heavy SEO Modules for Search Engines & Crawlers */}
      <FaqGuide
        repo={repo}
        fullName={fullName}
        rankLabel={getRankHumanLabel(rank)}
        score={score}
        responseTimeStr={responseTimeStr}
        mergeRateStr={mergeRateStr}
        firstTimerSuccessStr={firstTimerSuccessStr}
      />

      {/* Auth Modal Component */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title={authModalConfig.title}
        description={authModalConfig.description}
        source={authModalConfig.source}
      />
    </main>
    </>
  );
}
