"use client";

import { AlertTriangle, FileCode, Radar, RefreshCw, Upload } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { API_BASE_URL } from "@/lib/api";
import { UserRepoItem } from "./stackTypes";

interface RepoPickerProps {
  isAuthenticated: boolean;
  userRepos: UserRepoItem[];
  loadingRepos: boolean;
  selectedRepo: string;
  onSelectRepo: (v: string) => void;
  customRepoInput: string;
  onCustomRepoInput: (v: string) => void;
  activeTab: "github" | "manual";
  onTabChange: (t: "github" | "manual") => void;
  manifestContent: string;
  onManifestContent: (v: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  analyzing: boolean;
  scanStep: string;
  errorMessage: string | null;
  onScanRepository: (repoName: string) => void;
  onAnalyzeDirect: () => void;
}

export function RepoPicker({
  isAuthenticated,
  userRepos,
  loadingRepos,
  selectedRepo,
  onSelectRepo,
  customRepoInput,
  onCustomRepoInput,
  activeTab,
  onTabChange,
  manifestContent,
  onManifestContent,
  onFileUpload,
  analyzing,
  scanStep,
  errorMessage,
  onScanRepository,
  onAnalyzeDirect,
}: RepoPickerProps) {
  return (
    <div className="max-w-3xl mx-auto glass-panel border border-white/[0.1] rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      {/* Navigation Tabs */}
      <div className="flex border-b border-white/[0.08] mb-6">
        <button
          onClick={() => onTabChange("github")}
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
          onClick={() => onTabChange("manual")}
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
                  onChange={(e) => onSelectRepo(e.target.value)}
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
                  onClick={() => onScanRepository(selectedRepo)}
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
                onChange={(e) => onCustomRepoInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onScanRepository(customRepoInput)}
                className="flex-1 bg-zinc-900 border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => onScanRepository(customRepoInput)}
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
                onChange={onFileUpload}
                accept=".json,.mod,.toml,.txt"
                className="hidden"
              />
            </label>
          </div>
          <textarea
            rows={6}
            placeholder={`{\n  "dependencies": {\n    "next": "15.0.0",\n    "tailwindcss": "^3.4.0",\n    "prisma": "^5.0.0"\n  }\n}`}
            value={manifestContent}
            onChange={(e) => onManifestContent(e.target.value)}
            className="w-full bg-zinc-900 border border-white/[0.12] rounded-xl p-3.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
          />
          <div className="flex justify-between items-center pt-2">
            <span className="text-[11px] text-zinc-500">
              Supports package.json, go.mod, Cargo.toml, requirements.txt
            </span>
            <button
              onClick={onAnalyzeDirect}
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
  );
}
