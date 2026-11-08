"use client";

import React from "react";
import { useStackPicker } from "./components/useStackPicker";
import { useStackAnalysis } from "./components/useStackAnalysis";
import { RepoPicker } from "./components/RepoPicker";
import { ResultsSummary } from "./components/ResultsSummary";
import { DependencyGrid, IssueList } from "./components/IssueList";

export default function StackClient() {
  // Picker state (tabs, selection, manifest input) lives in useStackPicker;
  // results state (analysis, errors) lives in useStackAnalysis.
  const picker = useStackPicker();
  const analysis = useStackAnalysis();

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div className="card card-highlight p-6 sm:p-8">
        <div className="hero-badge">
          <span className="dot" />
          <span>PERSONALIZED CONTRIBUTOR MATCHING</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[var(--text-primary)] mb-2">
          Scan Your Tech Stack
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed mb-4">
          Why scavenge millions of random repos? GetMerged inspects your project dependencies to reveal fragile maintainer bottlenecks and open beginner issues in the exact packages you use every day.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill pill-green">✓ Supports package.json, go.mod, Cargo.toml</span>
          <span className="pill pill-purple">✓ Instant Dependency Scan</span>
          <span className="pill">100% Client-Side Private</span>
        </div>
      </div>

      {/* Input Selection Box */}
      <RepoPicker
        isAuthenticated={picker.isAuthenticated}
        userRepos={picker.userRepos}
        loadingRepos={picker.loadingRepos}
        selectedRepo={picker.selectedRepo}
        onSelectRepo={picker.setSelectedRepo}
        customRepoInput={picker.customRepoInput}
        onCustomRepoInput={picker.setCustomRepoInput}
        activeTab={picker.activeTab}
        onTabChange={picker.setActiveTab}
        manifestContent={picker.manifestContent}
        onManifestContent={picker.setManifestContent}
        onFileUpload={picker.handleFileUpload}
        analyzing={analysis.analyzing}
        scanStep={analysis.scanStep}
        errorMessage={analysis.errorMessage}
        onScanRepository={analysis.handleScanRepository}
        onAnalyzeDirect={() => analysis.handleAnalyzeDirect(picker.manifestContent)}
      />

      {/* Results View */}
      {analysis.analysisResult && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Health Summary Card */}
          <ResultsSummary result={analysis.analysisResult} alertSaved={analysis.alertSaved} />

          {/* Good First Issues in Your Stack */}
          <IssueList issues={analysis.allIssues} />

          {/* Detailed Dependency Health Grid */}
          <DependencyGrid dependencies={analysis.analysisResult.dependencies} />
        </div>
      )}
    </div>
  );
}
