"use client";

import { useCallback, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { StackAnalysisResult, flattenIssues } from "./stackTypes";

// Results state: analysis run, scan progress, errors. No picker state here.
export function useStackAnalysis() {
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<StackAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alertSaved, setAlertSaved] = useState<boolean>(false);

  const handleScanRepository = useCallback(async (repoName: string) => {
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
  }, []);

  const handleAnalyzeDirect = useCallback(async (manifestContent: string) => {
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
  }, []);

  const allIssues = useMemo(
    () => flattenIssues(analysisResult?.dependencies || []),
    [analysisResult]
  );

  return {
    analyzing,
    scanStep,
    analysisResult,
    errorMessage,
    alertSaved,
    allIssues,
    handleScanRepository,
    handleAnalyzeDirect,
  };
}
