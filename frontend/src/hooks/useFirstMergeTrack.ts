"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { useFirstMergePersistence } from "@/hooks/useFirstMergePersistence";
import { useFirstMergeEventQueue } from "@/hooks/useFirstMergeEventQueue";
import { useIssueClaims, postIssueClaim } from "@/hooks/useIssueClaims";
import { useFitRadar } from "@/hooks/useFitRadar";
import { useFirstMergeMatches, useGoodFirstIssues } from "@/hooks/useFirstMergeMatches";

export interface TrackedStatusItem {
  pr_id: string;
  owner: string;
  repo: string;
  pr_number: number;
  state: string;
  title: string;
  html_url: string;
  fetched_at: string;
  has_artifact: boolean;
  card_id: string;
  share_url: string;
  og_image_url: string;
}

export interface TrackedPRInput {
  pr_id: string;
  repository_id: string;
  full_name: string;
  pr_number: number;
  title: string;
  html_url: string;
  state: "open" | "changes_requested" | "approved" | "merged" | "closed";
}

export type FirstMergeStep = 1 | 2 | 3 | 4;

export interface ClaimIssueInput {
  id: number | string;
  title: string;
  html_url: string;
  number?: number;
}

export interface SelectRepoInput {
  id: string;
  full_name: string;
  language?: string;
  c_rank_tier?: string;
  c_rank_score?: number;
  match_score?: number;
}

/**
 * State machine for the First-Merge Track guided journey.
 * Owns all data fetching, persistence sync, PR tracking, and step
 * transitions; the track component itself is orchestration only.
 */
export function useFirstMergeTrack(trackedPRs: TrackedPRInput[]) {
  const { trackState, updateTrackState, mounted } = useFirstMergePersistence();
  const { queueTrackEvent, flushEventQueue } = useFirstMergeEventQueue();
  const [isLoggedIn] = useState<boolean>(
    () =>
      typeof document !== "undefined" &&
      document.cookie.includes("opendoor_token=")
  );
  const issueClaims = useIssueClaims(isLoggedIn);
  const { fitRadar } = useFitRadar(trackState.selectedRepo?.fullName);
  const { matches, loadingMatches } = useFirstMergeMatches(mounted);
  const { issues, loadingIssues, issuesError } = useGoodFirstIssues(
    mounted,
    trackState.selectedRepo?.fullName,
    trackState.selectedRepo?.id,
    trackState.step >= 2
  );

  // PR Merge Tracker: paste-a-URL tracking (AC1-AC9).
  const [prUrl, setPrUrl] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackNeedsAuth, setTrackNeedsAuth] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [trackedStatus, setTrackedStatus] = useState<Array<TrackedStatusItem>>(
    []
  );
  const [importUrl, setImportUrl] = useState<string | null>(null);

  // Multi-tab sync & state persistence (AC3)
  useEffect(() => {
    flushEventQueue();

    return () => {
      // pollTimerRef removed - cleanup handled in useGoodFirstIssues hook
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AC2: State derives directly from existing API data with monotonic forward advance
  useEffect(() => {
    if (!mounted) return;

    if (trackedPRs && trackedPRs.length > 0) {
      const matchingPR = trackState.selectedRepo
        ? trackedPRs.find(
            (p) =>
              p.full_name.toLowerCase() ===
              trackState.selectedRepo?.fullName.toLowerCase()
          ) || trackedPRs[0]
        : trackedPRs[0];

      if (matchingPR) {
        updateTrackState((prev) => {
          let nextStep = prev.step;
          if (matchingPR.state === "merged") {
            nextStep = 4;
          } else if (prev.step < 3) {
            nextStep = 3;
          }

          return {
            ...prev,
            step: Math.max(prev.step, nextStep) as FirstMergeStep,
            selectedRepo: prev.selectedRepo || {
              id: matchingPR.repository_id,
              fullName: matchingPR.full_name,
            },
            trackedPR: {
              prId: matchingPR.pr_id,
              prNumber: matchingPR.pr_number,
              title: matchingPR.title,
              htmlUrl: matchingPR.html_url,
              state: matchingPR.state,
            },
          };
        });
      }
    }
  }, [mounted, trackedPRs, updateTrackState, trackState.selectedRepo]);

  // AC1: post a templated claim comment via the user's GitHub token and persist
  const handleClaimIssue = useCallback(
    async (issue: ClaimIssueInput) => {
      const fullName = trackState.selectedRepo?.fullName || "";
      const issueNumber = Number(issue.number ?? issue.id);
      if (!fullName || !issueNumber) {
        issueClaims.setClaimState({
          posting: false,
          error: "Missing repo or issue info.",
          result: null,
        });
        return;
      }
      issueClaims.setClaimState({ posting: true, error: null, result: null });
      issueClaims.setNeedsGitHubAuth(false);
      try {
        const data = await postIssueClaim(fullName, issueNumber);
        issueClaims.setServerClaimedKeys(
          (prev) => new Set(prev).add(`${fullName}#${issueNumber}`)
        );
        issueClaims.setClaimState({ posting: false, error: null, result: data });
        updateTrackState((prev) => ({
          ...prev,
          claimedIssue: {
            id: issue.id,
            title: issue.title,
            url: issue.html_url,
            issueNumber: issue.number,
          },
          step: Math.max(prev.step, 3) as FirstMergeStep,
        }));
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            const raw = localStorage.getItem("opendoor_first_merge_track_v1");
            if (raw) {
              const state = JSON.parse(raw);
              if (
                state?.selectedRepo?.fullName === fullName &&
                Number(
                  state?.claimedIssue?.issueNumber ??
                    state?.claimedIssue?.id ??
                    0
                ) === issueNumber
              ) {
                delete state.claimedIssue;
                localStorage.setItem(
                  "opendoor_first_merge_track_v1",
                  JSON.stringify(state)
                );
              }
            }
          }
        } catch {
          // ignore
        }
        queueTrackEvent("first_merge_issue_claimed", {
          repo: fullName,
          issue_id: issue.id,
          issue_url: issue.html_url,
          server_synced: true,
          comment_posted: data.comment_posted,
        });
      } catch (err) {
        const e = err as Error & { needsAuth?: boolean; rateLimited?: boolean };
        if (e.needsAuth) {
          issueClaims.setNeedsGitHubAuth(true);
          issueClaims.setClaimState({
            posting: false,
            error: null,
            result: null,
          });
          return;
        }
        if (e.rateLimited) {
          issueClaims.setClaimState({
            posting: false,
            error:
              "Too many claim comments - please wait a few minutes and try again.",
            result: null,
          });
          return;
        }
        issueClaims.setClaimState({
          posting: false,
          error: e.message || "Could not post claim comment. Try again.",
          result: null,
        });
      }
    },
    [trackState.selectedRepo, updateTrackState, queueTrackEvent, issueClaims]
  );

  const handleManualAdvance = useCallback(
    (targetStep: FirstMergeStep) => {
      updateTrackState((prev) => ({
        ...prev,
        step: targetStep,
      }));
      queueTrackEvent("first_merge_manual_advance", { targetStep });
    },
    [updateTrackState, queueTrackEvent]
  );

  const handleRestartStep = useCallback(
    (stepToRestart: FirstMergeStep) => {
      updateTrackState((prev) => {
        if (stepToRestart === 1) {
          return {
            ...prev,
            step: 1,
            selectedRepo: null,
            claimedIssue: null,
            preflightEvaluation: null,
            trackedPR: null,
          };
        }
        if (stepToRestart === 2) {
          return {
            ...prev,
            step: 2,
            claimedIssue: null,
            preflightEvaluation: null,
            trackedPR: null,
          };
        }
        if (stepToRestart === 3) {
          return {
            ...prev,
            step: 3,
            preflightEvaluation: null,
            trackedPR: null,
          };
        }
        return {
          ...prev,
          step: 4,
        };
      });
      queueTrackEvent("first_merge_step_restarted", { step: stepToRestart });
    },
    [updateTrackState, queueTrackEvent]
  );

  const handleSelectRepo = useCallback(
    (repo: SelectRepoInput) => {
      updateTrackState((prev) => ({
        ...prev,
        selectedRepo: {
          id: repo.id,
          fullName: repo.full_name,
          language: repo.language,
          cRankTier: repo.c_rank_tier,
          cRankScore: repo.c_rank_score,
        },
        step: Math.max(prev.step, 2) as FirstMergeStep,
      }));
      queueTrackEvent("first_merge_repo_selected", {
        repo_name: repo.full_name,
        match_score: repo.match_score,
      });
    },
    [updateTrackState, queueTrackEvent]
  );

  // AC5: poll the server's cached PR status every 60s (server owns the loop).
  useEffect(() => {
    if (!mounted || !isLoggedIn) return;
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/user/pr-status`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data?.prs)) setTrackedStatus(data.prs);
      } catch {
        // non-blocking; keep last known state
      }
    };
    loadStatus();
    const iv = setInterval(loadStatus, 60000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [mounted, isLoggedIn]);

  // AC9: lazily offer to import a PR saved in localStorage by the legacy flow.
  useEffect(() => {
    if (!mounted || !isLoggedIn) return;
    try {
      const raw = localStorage.getItem("opendoor_first_merge_track_v1");
      if (!raw) return;
      const st = JSON.parse(raw);
      const url = st?.trackedPR?.htmlUrl || st?.trackedPR?.htmlUrlString;
      if (!url) return;
      if (!trackedStatus.some((p) => p.html_url === url)) {
        setImportUrl(url);
      }
    } catch {
      // ignore
    }
  }, [mounted, isLoggedIn, trackedStatus]);

  // Advance to step 4 when the server reports a tracked PR as merged.
  useEffect(() => {
    if (!mounted) return;
    if (trackedStatus.some((p) => p.state === "merged")) {
      updateTrackState((prev) => ({
        ...prev,
        step: Math.max(prev.step, 4) as FirstMergeStep,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, trackedStatus]);

  const fallbackCopy = useCallback((url: string) => {
    try {
      if (typeof document === "undefined") return;
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      // best-effort only
    }
  }, []);

  const copyShareLink = useCallback(
    (url: string) => {
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === "function"
        ) {
          navigator.clipboard.writeText(url).catch(() => fallbackCopy(url));
          return;
        }
      } catch {
        // fall through
      }
      fallbackCopy(url);
    },
    [fallbackCopy]
  );

  // AC2/AC3/AC8: validate + track a pasted GitHub PR URL.
  const handleTrackPR = useCallback(async () => {
    const url = prUrl.trim();
    if (!url) {
      setTrackError("Paste a GitHub pull request URL to track.");
      return;
    }
    setTrackLoading(true);
    setTrackError(null);
    setTrackNeedsAuth(false);
    setUpgradeRequired(false);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/prs/track`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pr_url: url }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (res.status === 401 || data?.needs_github_auth) {
        setTrackNeedsAuth(true);
        setTrackError(
          typeof data?.error === "string"
            ? data.error
            : "Connect your GitHub account to track a PR."
        );
        return;
      }
      if (res.status === 402 || data?.upgrade_required) {
        setUpgradeRequired(true);
        setTrackError(
          typeof data?.error === "string"
            ? data.error
            : "Upgrade to track more than 1 active PR."
        );
        return;
      }
      if (res.status === 409) {
        setTrackError(
          typeof data?.error === "string"
            ? data.error
            : "That PR is closed without being merged."
        );
        return;
      }
      if (res.status === 400) {
        setTrackError(
          typeof data?.error === "string" ? data.error : "Invalid PR URL."
        );
        return;
      }
      if (!res.ok) {
        setTrackError(
          typeof data?.error === "string"
            ? data.error
            : "Could not track this PR."
        );
        return;
      }
      setImportUrl(null);
      setPrUrl("");
    } catch {
      setTrackError("Network error while tracking PR. Please try again.");
    } finally {
      setTrackLoading(false);
    }
  }, [prUrl]);

  const importTrackedUrl = useCallback((url: string) => {
    setPrUrl(url);
    setImportUrl(null);
  }, []);

  const dismissImport = useCallback(() => {
    setImportUrl(null);
  }, []);

  return {
    mounted,
    trackState,
    matches,
    loadingMatches,
    issues,
    loadingIssues,
    issuesError,
    fitRadar,
    issueClaims,
    trackedStatus,
    importUrl,
    prUrl,
    setPrUrl,
    trackLoading,
    trackError,
    trackNeedsAuth,
    upgradeRequired,
    handleClaimIssue,
    handleManualAdvance,
    handleRestartStep,
    handleSelectRepo,
    handleTrackPR,
    copyShareLink,
    importTrackedUrl,
    dismissImport,
  };
}

export type FirstMergeTrackMachine = ReturnType<typeof useFirstMergeTrack>;
