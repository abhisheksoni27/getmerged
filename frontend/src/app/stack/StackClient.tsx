"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radar,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Upload,
  FileCode,
  Bell,
  RefreshCw,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

function GithubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`${className} fill-current shrink-0`} viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

interface StackIssue {
  id: number;
  title: string;
  url: string;
  comments: number;
  created_at: string;
}

interface StackRepoInfo {
  package_name: string;
  repo_full_name?: string;
  c_rank_tier: string;
  external_pr_merge_rate: number;
  time_to_first_response_hours: number;
  bus_factor: number;
  is_stale: boolean;
  good_first_issues_count: number;
  good_first_issues?: StackIssue[];
  maintainer_status: "welcoming" | "active" | "fragile" | "abandoned" | "unknown";
}

interface StackSummary {
  total_dependencies: number;
  indexed_dependencies: number;
  healthy_count: number;
  moderate_count: number;
  at_risk_count: number;
  total_good_first_issues: number;
  overall_health_grade: string;
  health_score_percentage: number;
}

interface StackAnalysisResult {
  repo_full_name?: string;
  manifest_type: string;
  summary: StackSummary;
  dependencies: StackRepoInfo[];
}

interface UserRepoItem {
  full_name: string;
  name: string;
  description?: string;
  language?: string;
  stars: number;
  is_private: boolean;
  default_branch: string;
}

export default function StackClient() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRepos, setUserRepos] = useState<UserRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [customRepoInput, setCustomRepoInput] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"github" | "manual">("github");
  const [manifestContent, setManifestContent] = useState<string>("");

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<StackAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alertSaved, setAlertSaved] = useState<boolean>(false);

  useEffect(() => {
    const hasToken =
      typeof document !== "undefined" && document.cookie.includes("opendoor_token=");
    setIsAuthenticated(hasToken);

    if (hasToken) {
      fetchUserRepositories();
    }
  }, []);

  const fetchUserRepositories = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/stack/user-repos`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.repositories) {
          setUserRepos(data.repositories);
          if (data.repositories.length > 0) {
            setSelectedRepo(data.repositories[0].full_name);
          }
        }
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleScanRepository = async (repoName: string) => {
    if (!repoName.trim()) {
      setErrorMessage("Please enter or select a valid repository name (e.g. vercel/next.js)");
      return;
    }

    setAnalyzing(true);
    setErrorMessage(null);
    setScanStep("Inspecting repository structure...");

    try {
      setTimeout(() => setScanStep("Locating package manifest (package.json, go.mod)..."), 400);
      setTimeout(() => setScanStep("Mapping dependencies to C-Rank repository indexes..."), 900);
      setTimeout(() => setScanStep("Analyzing maintainer latency and bus factors..."), 1400);

      const res = await fetch(`${API_BASE_URL}/api/v1/stack/scan-repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ repo_full_name: repoName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to scan repository: ${res.statusText}`);
      }

      const data: StackAnalysisResult = await res.json();
      setAnalysisResult(data);
      setAlertSaved(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to scan repository";
      setErrorMessage(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeDirect = async () => {
    setAnalyzing(true);
    setErrorMessage(null);
    setScanStep("Parsing manifest and extracting package dependencies...");

    try {
      if (!manifestContent.trim()) {
        throw new Error("Please paste manifest content or upload a file.");
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/stack/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: manifestContent.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to analyze dependencies");
      }

      const data: StackAnalysisResult = await res.json();
      setAnalysisResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setErrorMessage(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setManifestContent(content);
      setActiveTab("manual");
    };
    reader.readAsText(file);
  };

  const allIssues = (analysisResult?.dependencies || []).flatMap((d) =>
    (d.good_first_issues || []).map((issue) => ({
      ...issue,
      repo: d.repo_full_name || d.package_name,
      tier: d.c_rank_tier,
      merge_rate: d.external_pr_merge_rate,
      packageName: d.package_name,
    }))
  );

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <Radar className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          <span>In-Stack Opportunity & Dependency Health Radar</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold font-space tracking-tight text-white">
          Stalk Your Tech Stack.
          <span className="block text-emerald-400 mt-1">Find Openings in What You Run.</span>
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Why scavenge 300 million random GitHub repos? GetMerged scans the packages in your
          codebase to reveal fragile maintainer bottlenecks and open beginner issues in the exact
          tools you use every day.
        </p>
      </div>

      {/* Input Selection Box */}
      <div className="max-w-3xl mx-auto glass-panel border border-white/[0.1] rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-white/[0.08] mb-6">
          <button
            onClick={() => setActiveTab("github")}
            className={`pb-3 px-4 font-mono text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "github"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <GithubIcon className="h-4 w-4" />
            <span>GitHub Repositories</span>
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`pb-3 px-4 font-mono text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "manual"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileCode className="h-4 w-4" />
            <span>Paste / Upload Manifest</span>
          </button>
        </div>

        {activeTab === "github" ? (
          <div className="space-y-6">
            {!isAuthenticated ? (
              <div className="text-center py-6 px-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <GithubIcon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    Connect GitHub to Scan Your Repos
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Sign in with GitHub to select your projects directly. We will analyze your stack
                    and notify you when your dependencies need help.
                  </p>
                </div>
                <a
                  href={`${API_BASE_URL}/api/v1/auth/github?return_to=/stack`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <GithubIcon className="h-4 w-4" />
                  Connect GitHub in 1 Click
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-xs font-mono text-zinc-300 font-semibold">
                  Select One of Your Repositories:
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    disabled={loadingRepos || analyzing}
                    className="flex-1 bg-zinc-900 border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  >
                    {userRepos.map((r) => (
                      <option key={r.full_name} value={r.full_name}>
                        {r.full_name} ({r.language || "code"} • ★{r.stars})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleScanRepository(selectedRepo)}
                    disabled={analyzing || !selectedRepo}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {analyzing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Radar className="h-4 w-4" />
                    )}
                    <span>Scan Stack</span>
                  </button>
                </div>
              </div>
            )}

            {/* Manual Repo Lookup Form */}
            <div className="pt-4 border-t border-white/[0.08]">
              <label className="block text-xs font-mono text-zinc-400 mb-2">
                Or Scan Any Public GitHub Repo:
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="e.g. vercel/next.js or supabase/supabase"
                  value={customRepoInput}
                  onChange={(e) => setCustomRepoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScanRepository(customRepoInput)}
                  className="flex-1 bg-zinc-900 border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => handleScanRepository(customRepoInput)}
                  disabled={analyzing || !customRepoInput.trim()}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-mono text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/[0.1]"
                >
                  <span>Scan Public Repo</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-zinc-300 font-semibold">
                Paste package.json, go.mod, Cargo.toml, or requirements.txt:
              </label>
              <label className="cursor-pointer text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload File</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".json,.mod,.toml,.txt"
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              rows={6}
              placeholder={`{\n  "dependencies": {\n    "next": "15.0.0",\n    "tailwindcss": "^3.4.0",\n    "prisma": "^5.0.0"\n  }\n}`}
              value={manifestContent}
              onChange={(e) => setManifestContent(e.target.value)}
              className="w-full bg-zinc-900 border border-white/[0.12] rounded-xl p-3.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-zinc-500">
                Supports package.json, go.mod, Cargo.toml, requirements.txt
              </span>
              <button
                onClick={handleAnalyzeDirect}
                disabled={analyzing || !manifestContent.trim()}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                {analyzing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Radar className="h-4 w-4" />
                )}
                <span>Analyze Manifest</span>
              </button>
            </div>
          </div>
        )}

        {/* Scanning status banner */}
        {analyzing && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 font-mono text-xs animate-pulse">
            <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
            <span>{scanStep}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-3 text-red-300 font-mono text-xs">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Results View */}
      {analysisResult && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Health Summary Card */}
          <div className="glass-panel border border-white/[0.1] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                  <span>Manifest: {analysisResult.manifest_type}</span>
                  {analysisResult.repo_full_name && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">
                        {analysisResult.repo_full_name}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-2xl font-bold font-space text-white flex items-center gap-3">
                  <span>Stack Health Grade:</span>
                  <span
                    className={`inline-block px-3 py-0.5 rounded-lg font-mono text-xl font-black ${
                      analysisResult.summary.overall_health_grade === "S" ||
                      analysisResult.summary.overall_health_grade === "A"
                        ? "bg-emerald-500/20 border border-emerald-500 text-emerald-400"
                        : analysisResult.summary.overall_health_grade === "B"
                        ? "bg-amber-500/20 border border-amber-500 text-amber-400"
                        : "bg-red-500/20 border border-red-500 text-red-400"
                    }`}
                  >
                    Tier {analysisResult.summary.overall_health_grade}
                  </span>
                </h2>
              </div>

              {/* Alert Status */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  <Bell className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{alertSaved ? "Stack Saved & Monitored for Weekly Alerts" : "Stack Analysis Ready"}</span>
                </span>
              </div>
            </div>

            {/* Metrics Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
                <div className="text-zinc-400 text-xs font-mono mb-1">Dependencies</div>
                <div className="text-2xl font-bold font-mono text-white">
                  {analysisResult.summary.total_dependencies}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  {analysisResult.summary.indexed_dependencies} indexed in C-Rank
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                <div className="text-emerald-400 text-xs font-mono mb-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Healthy Repos
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-300">
                  {analysisResult.summary.healthy_count}
                </div>
                <div className="text-[11px] text-emerald-500/80 mt-1">Tier S & A (Fast Merge)</div>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20">
                <div className="text-amber-400 text-xs font-mono mb-1 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" /> Fragile / At Risk
                </div>
                <div className="text-2xl font-bold font-mono text-amber-300">
                  {analysisResult.summary.at_risk_count}
                </div>
                <div className="text-[11px] text-amber-500/80 mt-1">Bus Factor = 1 or Tier D</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-900/30 border border-emerald-400/30">
                <div className="text-emerald-300 text-xs font-mono mb-1 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Open Good First Issues
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {analysisResult.summary.total_good_first_issues}
                </div>
                <div className="text-[11px] text-emerald-300/80 mt-1">Beginner Issues in Your Stack</div>
              </div>
            </div>
          </div>

          {/* Good First Issues in Your Stack */}
          {allIssues.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold font-space text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                    <span>Good First Issues in Your Tech Stack</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Open beginner issues in the exact packages and libraries your code runs on.
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  {allIssues.length} opportunities
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-5 rounded-2xl glass-panel border border-white/[0.1] hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400 truncate">
                          {issue.repo}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Tier {issue.tier} • {issue.merge_rate}% Merge
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                        {issue.title}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                      <span className="text-zinc-400 font-mono text-[11px]">
                        💬 {issue.comments} comments
                      </span>
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 group-hover:underline"
                      >
                        <span>Solve This Issue</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Dependency Health Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold font-space text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-400" />
                <span>All Detected Dependencies</span>
              </h3>
              <span className="text-xs font-mono text-zinc-400">
                {analysisResult.dependencies.length} packages
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysisResult.dependencies.map((dep) => (
                <div
                  key={dep.package_name}
                  className="p-4 rounded-xl glass-card border border-white/[0.08] hover:border-white/[0.16] transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold font-mono text-white truncate">
                        {dep.package_name}
                      </div>
                      {dep.repo_full_name && (
                        <Link
                          href={`/repo/${dep.repo_full_name}`}
                          className="text-[11px] font-mono text-zinc-400 hover:text-emerald-400 truncate block"
                        >
                          {dep.repo_full_name}
                        </Link>
                      )}
                    </div>

                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        dep.c_rank_tier === "S" || dep.c_rank_tier === "A"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : dep.c_rank_tier === "B"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : dep.c_rank_tier === "C" || dep.c_rank_tier === "D"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {dep.c_rank_tier === "UNKNOWN" ? "Unranked" : `Tier ${dep.c_rank_tier}`}
                    </span>
                  </div>

                  {dep.c_rank_tier !== "UNKNOWN" ? (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] text-[11px] font-mono text-zinc-400">
                      <div>
                        <span className="block text-[10px] text-zinc-500">Merge Rate</span>
                        <span className="font-bold text-zinc-200">
                          {dep.external_pr_merge_rate}%
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500">First Review</span>
                        <span className="font-bold text-zinc-200">
                          {dep.time_to_first_response_hours}h
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500">Bus Factor</span>
                        <span
                          className={`font-bold ${
                            dep.bus_factor <= 1 ? "text-amber-400" : "text-zinc-200"
                          }`}
                        >
                          {dep.bus_factor} reviewer{dep.bus_factor === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-500 font-mono pt-2 border-t border-white/[0.06]">
                      Not yet indexed in top C-Rank repository graph
                    </div>
                  )}

                  {dep.good_first_issues_count > 0 && (
                    <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-emerald-400">
                      <span>{dep.good_first_issues_count} Good First Issue(s)</span>
                      {dep.repo_full_name && (
                        <Link
                          href={`/repo/${dep.repo_full_name}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <span>View</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
