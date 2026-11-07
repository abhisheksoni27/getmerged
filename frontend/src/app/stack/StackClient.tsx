"use client";

import React from "react";
import { Radar } from "lucide-react";
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
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <Radar className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          <span>In-Stack Opportunity & Dependency Health Radar</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold font-space tracking-tight text-[var(--text-primary)]">
          Stalk Your Tech Stack.
          <span className="block text-emerald-400 mt-1">Find Openings in What You Run.</span>
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          Why scavenge 300 million random GitHub repos? GetMerged scans the packages in your
          codebase to reveal fragile maintainer bottlenecks and open beginner issues in the exact
          tools you use every day.
        </p>
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
