"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo, MacroStats } from "@/types/opendoor";
import { captureReferralFromUrl } from "@/lib/referral";
import { AuthModal } from "@/components/AuthModal";
import { LanguageMatchQuiz } from "@/components/LanguageMatchQuiz";
import {
  useHomeData,
  HeroSection,
  ProblemSolution,
  SpotlightSection,
  ScoreFactors,
  MaintainerCta,
  RepoShowroom,
  EcosystemRankings,
  HowItWorks,
  FinalCta,
} from "./home-sections";

interface HomeClientProps {
  initialStats: MacroStats | null;
  initialRepos?: Repo[];
  initialSpotlightRepos?: Repo[];
}

export default function HomeClient({
  initialStats,
  initialRepos = [],
  initialSpotlightRepos = [],
}: HomeClientProps) {
  const {
    repos,
    stats,
    visibleRepos,
    spotlightVisible,
    rankedLanguages,
    loading,
    selectedTier,
    selectedBucket,
    selectedMinMergeRate,
    selectedFirstTimerBucket,
    searchQuery,
    isLoggedIn,
    famousRepos,
    placeholderIndex,
    applyCategoryPreset,
    resetFilters,
    clearSearch,
    applyQuickSearch,
  } = useHomeData({ initialStats, initialRepos, initialSpotlightRepos });

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalConfig, setAuthModalConfig] = useState<{ title?: string; description?: string; source?: string }>({});

  const openAuthModal = (title?: string, description?: string, source = "modal") => {
    setAuthModalConfig({ title, description, source });
    setIsAuthModalOpen(true);
  };

  // Persist referral attribution from /?ref=CODE for 30 days (AC1)
  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  const scrollToGrid = () => {
    const gridEl = document.getElementById("leaderboard-grid");
    if (gridEl) {
      gridEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent">
      <Header
        searchQuery={searchQuery}
        placeholderText={`Search repositories, e.g. ${famousRepos[placeholderIndex]}`}
      />

      <HeroSection
        stats={stats}
        repos={initialRepos.length > 0 ? initialRepos : repos}
        searchQuery={searchQuery}
        isLoggedIn={isLoggedIn}
        famousRepos={famousRepos}
        placeholderIndex={placeholderIndex}
        onClearSearch={clearSearch}
        onQuickSearch={applyQuickSearch}
      />

      <ProblemSolution />

      <SpotlightSection spotlightVisible={spotlightVisible} loading={loading} isLoggedIn={isLoggedIn} />

      <ScoreFactors />

      <MaintainerCta />

      <RepoShowroom
        visibleRepos={visibleRepos}
        loading={loading}
        stats={stats}
        isLoggedIn={isLoggedIn}
        selectedTier={selectedTier}
        selectedBucket={selectedBucket}
        selectedFirstTimerBucket={selectedFirstTimerBucket}
        selectedMinMergeRate={selectedMinMergeRate}
        onSelectCategory={applyCategoryPreset}
        onResetFilters={resetFilters}
      />

      <EcosystemRankings languages={rankedLanguages} />

      <HowItWorks />

      <FinalCta
        isLoggedIn={isLoggedIn}
        onExplore={scrollToGrid}
        onSignIn={() =>
          openAuthModal("Sign in to GetMerged", "Sign in to access trending repositories and contributor insights.", "homepage_cta_banner")
        }
      />

      {/* Language Quiz */}
      <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <LanguageMatchQuiz />
      </div>

      <Footer />

      {/* Auth Modal Component */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title={authModalConfig.title}
        description={authModalConfig.description}
        source={authModalConfig.source}
      />
    </div>
  );
}
