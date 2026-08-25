"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Compass,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Search,
  Check,
  ChevronRight,
} from "lucide-react";
import posthog from "posthog-js";
import { API_BASE_URL } from "@/lib/api";

const STORAGE_KEY = "opendoor_first_merge_track_v1";
const EVENT_QUEUE_KEY = "opendoor_first_merge_events_v1";
const MAX_QUEUE_SIZE = 50;

export interface FirstMergeTrackState {
  step: 1 | 2 | 3 | 4; // 1: Pick Repo, 2: Claim GFI, 3: Preflight, 4: Merged PR
  selectedRepo: {
    id: string;
    fullName: string;
    language?: string;
    cRankTier?: string;
    cRankScore?: number;
  } | null;
  claimedIssue: {
    id: number | string;
    title: string;
    url: string;
    issueNumber?: number;
  } | null;
  preflightEvaluation: {
    evalId?: string;
    overallScore: number;
    readyToMerge: boolean;
    passedChecksCount: number;
    totalChecksCount: number;
    evaluatedAt: string;
  } | null;
  trackedPR: {
    prId: string;
    prNumber: number;
    title: string;
    htmlUrl: string;
    state: "open" | "changes_requested" | "approved" | "merged" | "closed";
  } | null;
  updatedAt: number;
}

const DEFAULT_STATE: FirstMergeTrackState = {
  step: 1,
  selectedRepo: null,
  claimedIssue: null,
  preflightEvaluation: null,
  trackedPR: null,
  updatedAt: Date.now(),
};

// In-memory fallback for private browsing / SSR
let inMemoryState: FirstMergeTrackState = { ...DEFAULT_STATE };
let inMemoryQueue: Array<{ event: string; properties: Record<string, unknown>; timestamp: number }> = [];

function loadPersistedState(): FirstMergeTrackState {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return inMemoryState;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return inMemoryState;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.step === "number") {
      return parsed;
    }
  } catch {
    // Fallback on error (e.g. private browsing storage restricted)
  }
  return inMemoryState;
}

function savePersistedState(state: FirstMergeTrackState) {
  inMemoryState = state;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Graceful fallback
  }
}

// Bounded event queue (max 50 items) flushed best-effort (AC4)
function queueTrackEvent(event: string, properties: Record<string, unknown> = {}) {
  const item = { event, properties, timestamp: Date.now() };
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      let queue: Array<{ event: string; properties: Record<string, unknown>; timestamp: number }> = [];
      try {
        const raw = localStorage.getItem(EVENT_QUEUE_KEY);
        if (raw) queue = JSON.parse(raw);
      } catch {
        queue = inMemoryQueue;
      }
      if (!Array.isArray(queue)) queue = [];
      queue.push(item);
      if (queue.length > MAX_QUEUE_SIZE) {
        queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
      }
      localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(queue));
      inMemoryQueue = queue;
    } else {
      inMemoryQueue.push(item);
      if (inMemoryQueue.length > MAX_QUEUE_SIZE) {
        inMemoryQueue = inMemoryQueue.slice(inMemoryQueue.length - MAX_QUEUE_SIZE);
      }
    }
  } catch {
    inMemoryQueue.push(item);
    if (inMemoryQueue.length > MAX_QUEUE_SIZE) {
      inMemoryQueue = inMemoryQueue.slice(inMemoryQueue.length - MAX_QUEUE_SIZE);
    }
  }

  // Attempt best-effort flush immediately via posthog if available
  flushEventQueue();
}

function flushEventQueue() {
  try {
    let itemsToFlush: Array<{ event: string; properties: Record<string, unknown>; timestamp: number }> = [];
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(EVENT_QUEUE_KEY);
      if (raw) {
        itemsToFlush = JSON.parse(raw);
      }
    }
    if (itemsToFlush.length === 0) {
      itemsToFlush = inMemoryQueue;
    }

    if (itemsToFlush.length > 0 && typeof posthog !== "undefined" && typeof posthog.capture === "function") {
      const remaining: typeof itemsToFlush = [];
      for (const item of itemsToFlush) {
        try {
          posthog.capture(item.event, {
            ...item.properties,
            queued_at: item.timestamp,
            first_merge_track: true,
          });
        } catch {
          remaining.push(item);
        }
      }
      inMemoryQueue = remaining;
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(remaining));
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // Non-blocking best effort
  }
}

interface MatchRepoItem {
  id: string;
  full_name: string;
  language?: string;
  c_rank_tier?: string;
  c_rank_score?: number;
  match_score?: number;
  reasons?: string[];
  stars?: number;
  description?: string;
}

interface GoodFirstIssueItem {
  id: number | string;
  title: string;
  html_url: string;
  number?: number;
  comments_count?: number;
  created_at?: string;
}

interface FitRadarData {
  language_match: number;
  onboarding_quality: number;
  first_timer_receptivity: number;
  review_speed: number;
  merge_probability: number;
  contributor_level: string;
}

interface Props {
  trackedPRs?: Array<{
    pr_id: string;
    repository_id: string;
    full_name: string;
    pr_number: number;
    title: string;
    html_url: string;
    state: "open" | "changes_requested" | "approved" | "merged" | "closed";
  }>;
}

export function FirstMergeTrack({ trackedPRs = [] }: Props) {
  const [trackState, setTrackState] = useState<FirstMergeTrackState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);

  // Discovery data for Step 1
  const [matches, setMatches] = useState<MatchRepoItem[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [fitRadar, setFitRadar] = useState<FitRadarData | null>(null);

  // Issues data for Step 2
  const [issues, setIssues] = useState<GoodFirstIssueItem[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);

  // Polling backoff reference
  const pollAttemptRef = useRef(0);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Multi-tab sync & state persistence (AC3)
  useEffect(() => {
    setMounted(true);
    const initial = loadPersistedState();
    setTrackState(initial);

    // Multi-tab storage listener to prevent write clobbering & sync state
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const remoteState: FirstMergeTrackState = JSON.parse(e.newValue);
          setTrackState((prev) => {
            // Monotonic forward advancement check or newer timestamp
            if (remoteState.updatedAt > (prev.updatedAt || 0) || remoteState.step > prev.step) {
              return remoteState;
            }
            return prev;
          });
        } catch {
          // ignore parsing error
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    flushEventQueue();

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Update state helper with monotonic forward advance & persistence
  const updateTrackState = useCallback(
    (updater: (prev: FirstMergeTrackState) => FirstMergeTrackState) => {
      setTrackState((prev) => {
        const next = updater(prev);
        // Ensure monotonic advance or valid timestamp update
        const updated: FirstMergeTrackState = {
          ...next,
          updatedAt: Date.now(),
        };
        savePersistedState(updated);
        return updated;
      });
    },
    []
  );

  // AC2: State derives directly from existing API data with monotonic forward advance
  useEffect(() => {
    if (!mounted) return;

    // Check tracked PRs to automatically update Preflight / PR Merged state
    if (trackedPRs && trackedPRs.length > 0) {
      // Find matching PR if we have a selected repo, or take the latest active PR
      const matchingPR = trackState.selectedRepo
        ? trackedPRs.find((p) => p.full_name.toLowerCase() === trackState.selectedRepo?.fullName.toLowerCase()) || trackedPRs[0]
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
            step: Math.max(prev.step, nextStep) as 1 | 2 | 3 | 4,
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

  // Load matches / Fit Radar for Step 1
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    setLoadingMatches(true);

    fetch(`${API_BASE_URL}/api/v1/user/top-matches`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (cancelled) return;
        if (Array.isArray(resData?.data) && resData.data.length > 0) {
          setMatches(resData.data);
        } else {
          // Fallback to /api/v1/match?languages=typescript,javascript,go,python,rust
          fetch(`${API_BASE_URL}/api/v1/match?languages=typescript,javascript,go,python,rust&limit=6`)
            .then((r) => (r.ok ? r.json() : null))
            .then((mData) => {
              if (!cancelled && Array.isArray(mData?.data)) {
                setMatches(mData.data);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingMatches(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  // Fetch Fit Radar when a repo is selected
  useEffect(() => {
    if (!trackState.selectedRepo?.fullName) {
      setFitRadar(null);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(trackState.selectedRepo.fullName)}/fit-radar`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.fit_radar) {
          setFitRadar(data.fit_radar);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [trackState.selectedRepo?.fullName]);

  // Load Good First Issues for Step 2 with Exponential Backoff + Jitter on polling (AC4)
  const fetchIssues = useCallback(() => {
    const repoIdentifier = trackState.selectedRepo?.fullName || trackState.selectedRepo?.id;
    if (!repoIdentifier) return;

    setLoadingIssues(true);
    setIssuesError(null);

    fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(repoIdentifier)}/good-first-issues`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Could not load issues (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        pollAttemptRef.current = 0;
        const list = Array.isArray(data?.data) ? data.data : [];
        setIssues(list);
        if (list.length === 0) {
          setIssuesError("No active good-first-issues currently found in this repo.");
        }
      })
      .catch((err) => {
        setIssuesError(err instanceof Error ? err.message : "Failed to load good first issues");
        // Exponential backoff with jitter: delay = min(30000, 1000 * 2^attempt + jitter)
        const attempt = pollAttemptRef.current;
        if (attempt < 5) {
          const jitter = Math.floor(Math.random() * 500);
          const delay = Math.min(30000, Math.pow(2, attempt) * 1000 + jitter);
          pollAttemptRef.current += 1;
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
          pollTimerRef.current = setTimeout(() => {
            fetchIssues();
          }, delay);
        }
      })
      .finally(() => {
        setLoadingIssues(false);
      });
  }, [trackState.selectedRepo]);

  useEffect(() => {
    if (trackState.step >= 2 && trackState.selectedRepo) {
      fetchIssues();
    }
  }, [trackState.step, trackState.selectedRepo, fetchIssues]);

  // Handlers for steps
  const handleSelectRepo = (repo: MatchRepoItem) => {
    updateTrackState((prev) => ({
      ...prev,
      selectedRepo: {
        id: repo.id,
        fullName: repo.full_name,
        language: repo.language,
        cRankTier: repo.c_rank_tier,
        cRankScore: repo.c_rank_score,
      },
      step: Math.max(prev.step, 2) as 1 | 2 | 3 | 4,
    }));
    queueTrackEvent("first_merge_repo_selected", {
      repo_name: repo.full_name,
      match_score: repo.match_score,
    });
  };

  const handleClaimIssue = (issue: GoodFirstIssueItem) => {
    updateTrackState((prev) => ({
      ...prev,
      claimedIssue: {
        id: issue.id,
        title: issue.title,
        url: issue.html_url,
        issueNumber: issue.number,
      },
      step: Math.max(prev.step, 3) as 1 | 2 | 3 | 4,
    }));
    queueTrackEvent("first_merge_issue_claimed", {
      repo: trackState.selectedRepo?.fullName,
      issue_id: issue.id,
      issue_url: issue.html_url,
    });
  };

  const handleManualAdvance = (targetStep: 1 | 2 | 3 | 4) => {
    // AC5: Manual step advance permitted without blocking on background API sync delays
    updateTrackState((prev) => ({
      ...prev,
      step: targetStep,
    }));
    queueTrackEvent("first_merge_manual_advance", { targetStep });
  };

  const handleRestartStep = (stepToRestart: 1 | 2 | 3 | 4) => {
    // AC4: Terminal failure UI with 'Restart Step' button
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
  };

  if (!mounted) return null;

  const currentStep = trackState.step;
  const isTerminalPRClosed =
    trackState.trackedPR !== null &&
    trackState.trackedPR.state === "closed";

  const stepsConfig = [
    { num: 1, title: "Repo Match", desc: "Pick a high-probability repo" },
    { num: 2, title: "Issue Claim", desc: "Select a Good First Issue" },
    { num: 3, title: "Preflight Check", desc: "Test PR readiness & forecast" },
    { num: 4, title: "PR Merged", desc: "Track review to merge" },
  ];

  return (
    <section
      data-testid="first-merge-track"
      className="mb-8 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 p-5 sm:p-6 shadow-sm"
      aria-label="First-Merge Track"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
              ★
            </span>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">First-Merge Track</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              Guided Journey
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            A step-by-step roadmap from repo discovery to your first merged pull request.
          </p>
        </div>

        {/* Manual Step Switcher / Skip Control (AC5) */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span>Jump to:</span>
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              onClick={() => handleManualAdvance(s as 1 | 2 | 3 | 4)}
              className={`h-6 w-6 rounded-md text-xs font-bold transition-colors ${
                currentStep === s
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
              title={`Step ${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 4-Step Progress Indicator (AC1) */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stepsConfig.map((s) => {
          const isDone = currentStep > s.num || (s.num === 4 && trackState.trackedPR?.state === "merged");
          const isCurrent = currentStep === s.num && !(s.num === 4 && trackState.trackedPR?.state === "merged");

          return (
            <div
              key={s.num}
              onClick={() => handleManualAdvance(s.num as 1 | 2 | 3 | 4)}
              className={`cursor-pointer rounded-xl border p-3 transition-all ${
                isCurrent
                  ? "border-emerald-500 bg-white shadow-sm ring-1 ring-emerald-500"
                  : isDone
                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                  : "border-zinc-200 bg-zinc-50/60 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="flex items-center gap-2">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : isCurrent ? (
                  <CircleDashed className="h-4 w-4 shrink-0 animate-spin text-emerald-600" />
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600">
                    {s.num}
                  </span>
                )}
                <span className="text-xs font-bold text-zinc-900">{s.title}</span>
              </div>
              <p className="mt-1 line-clamp-1 text-[11px] text-zinc-500">{s.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Step Contents */}
      <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs">
        {/* STEP 1: Repo Match + Fit Radar */}
        {currentStep === 1 && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Step 1: Pick a Welcoming Repo
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Select a repository with high first-timer merge rates and responsive maintainers.
                </p>
              </div>
              <Link
                href="/repos"
                className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 shrink-0"
              >
                Browse all repos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loadingMatches ? (
              <div className="mt-4 py-8 text-center text-xs text-zinc-400 animate-pulse">
                Finding highest-fit repositories for you…
              </div>
            ) : matches.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-500">
                No recommendations found yet. Search any welcoming repository to get started.
                <div className="mt-2">
                  <Link
                    href="/repos"
                    className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    <Search className="h-3.5 w-3.5" /> Explore Repositories
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {matches.slice(0, 3).map((m) => (
                  <div
                    key={m.id || m.full_name}
                    className="flex flex-col justify-between rounded-lg border border-zinc-200 bg-zinc-50/50 p-3.5 hover:border-emerald-400 hover:bg-white transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="truncate text-xs font-bold text-zinc-900" title={m.full_name}>
                          {m.full_name}
                        </span>
                        {m.c_rank_tier && (
                          <span className="shrink-0 rounded bg-zinc-900 px-1.5 py-0.2 text-[10px] font-bold text-white">
                            {m.c_rank_tier}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">
                        {m.description || "Active community with beginner friendly issues."}
                      </p>
                      {m.reasons && m.reasons.length > 0 && (
                        <div className="mt-2 text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                          <Check className="h-3 w-3 shrink-0" /> {m.reasons[0]}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleSelectRepo(m)}
                      className="mt-3 flex w-full items-center justify-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                    >
                      Select & Claim Issue <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Issue Claim (reuses /repos/:id/good-first-issues) */}
        {currentStep === 2 && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-emerald-600" /> Step 2: Claim a Good First Issue
                  </h3>
                  {trackState.selectedRepo && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-mono font-semibold text-zinc-800">
                      {trackState.selectedRepo.fullName}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Pick an open starter issue to work on, then proceed to Preflight evaluation.
                </p>
              </div>
              <button
                onClick={() => handleRestartStep(1)}
                className="text-xs text-zinc-400 hover:text-zinc-700 underline cursor-pointer"
              >
                Change Repo
              </button>
            </div>

            {/* Fit Radar Snapshot if available */}
            {fitRadar && (
              <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-950">Fit Radar:</span>
                  <span className="text-zinc-600">
                    Onboarding: {fitRadar.onboarding_quality}% · First-timer: {fitRadar.first_timer_receptivity}% · Merge prob: {fitRadar.merge_probability}%
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-800 capitalize font-medium">
                  {fitRadar.contributor_level || "beginner"} fit
                </span>
              </div>
            )}

            {/* Issues List */}
            {loadingIssues ? (
              <div className="mt-4 py-8 text-center text-xs text-zinc-400 animate-pulse">
                Fetching open Good First Issues for {trackState.selectedRepo?.fullName}…
              </div>
            ) : issuesError ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  {issuesError}
                </div>
                <p className="mt-1 text-amber-800">
                  You can restart this step to choose another repo, or manually proceed if you already picked an issue.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleRestartStep(1)}
                    className="rounded-md bg-amber-700 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800"
                  >
                    Restart Step: Pick Another Repo
                  </button>
                  <button
                    onClick={() => handleManualAdvance(3)}
                    className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-50"
                  >
                    Proceed to Preflight Check →
                  </button>
                </div>
              </div>
            ) : issues.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-500">
                No good-first-issues returned.
                <div className="mt-2 flex justify-center gap-2">
                  <button
                    onClick={() => handleRestartStep(1)}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    Choose Another Repo
                  </button>
                  <button
                    onClick={() => handleManualAdvance(3)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Skip to Preflight →
                  </button>
                </div>
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 hover:bg-white hover:border-emerald-400 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate block text-xs font-semibold text-zinc-900 hover:text-emerald-700"
                      >
                        {issue.title} <ExternalLink className="inline h-3 w-3 text-zinc-400" />
                      </a>
                      <span className="text-[11px] text-zinc-400">
                        #{issue.number || issue.id}
                      </span>
                    </div>

                    <button
                      onClick={() => handleClaimIssue(issue)}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shrink-0 cursor-pointer"
                    >
                      Claim Issue & Run Preflight →
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* STEP 3: Preflight Check & PR registration */}
        {currentStep === 3 && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Step 3: Run Preflight Check
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Evaluate PR quality before submitting to avoid common reviewer rejections.
                </p>
              </div>
              <button
                onClick={() => handleRestartStep(2)}
                className="text-xs text-zinc-400 hover:text-zinc-700 underline cursor-pointer"
              >
                Back to Issues
              </button>
            </div>

            {/* Context bar */}
            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold">Target:</span>{" "}
                <span className="font-mono text-zinc-900 font-bold">
                  {trackState.selectedRepo?.fullName || "Selected Repository"}
                </span>
                {trackState.claimedIssue && (
                  <span className="ml-2 text-zinc-500">
                    · Issue:{" "}
                    <a
                      href={trackState.claimedIssue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-emerald-700"
                    >
                      {trackState.claimedIssue.title}
                    </a>
                  </span>
                )}
              </div>
            </div>

            {/* CTA to open preflight evaluation page or manual register */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <h4 className="text-xs font-bold text-emerald-950">Preflight Evaluator</h4>
                <p className="mt-1 text-[11px] text-emerald-800 leading-relaxed">
                  Run automated heuristics on test coverage, description length, and file diff size for your branch.
                </p>
                <div className="mt-3">
                  <Link
                    href={
                      trackState.selectedRepo?.fullName
                        ? `/preflight?repo=${encodeURIComponent(trackState.selectedRepo.fullName)}`
                        : `/preflight`
                    }
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Open Preflight Tool <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <h4 className="text-xs font-bold text-zinc-900">Submitted your PR?</h4>
                <p className="mt-1 text-[11px] text-zinc-600 leading-relaxed">
                  Once your PR is created on GitHub, advance to monitor review benchmarks and merge tracking.
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => handleManualAdvance(4)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer"
                  >
                    Track PR to Merge →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: PR Merged / Outcome Tracking */}
        {currentStep === 4 && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 text-emerald-600" /> Step 4: PR Merge Journey
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Tracking live review benchmarks, reviewer activity, and merge status.
                </p>
              </div>
              <button
                onClick={() => handleRestartStep(1)}
                className="text-xs text-zinc-400 hover:text-zinc-700 underline cursor-pointer"
              >
                Start New Track
              </button>
            </div>

            {/* Edge Case: Terminal failure UI (issue taken / PR closed unmerged) (AC4) */}
            {isTerminalPRClosed ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                <div className="flex items-center gap-1.5 font-bold text-red-900">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  PR was closed without merging
                </div>
                <p className="mt-1 text-red-700 leading-relaxed">
                  Don&apos;t worry — open source contributions often take multiple tries. You can pick another issue or repo and try again with Preflight checks.
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => handleRestartStep(2)}
                    className="inline-flex items-center gap-1 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 cursor-pointer"
                  >
                    Restart Step: Pick Another Issue
                  </button>
                </div>
              </div>
            ) : trackState.trackedPR?.state === "merged" ? (
              <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-xs text-violet-900">
                <div className="flex items-center gap-1.5 font-bold text-violet-950 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-violet-600" />
                  First Merge Accomplished! 🎉
                </div>
                <p className="mt-1 text-violet-800 leading-relaxed">
                  Your pull request in <strong>{trackState.trackedPR.title}</strong> has been successfully merged!
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <a
                    href={trackState.trackedPR.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800"
                  >
                    View Merged PR <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    onClick={() => handleRestartStep(1)}
                    className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-50"
                  >
                    Start Another Contribution
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 text-xs text-emerald-950">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">PR Tracking Active</div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    Awaiting Merge
                  </span>
                </div>
                <p className="mt-1 text-zinc-600 leading-relaxed">
                  Your pull request is being monitored via background sync. Live review metrics and median merge times are visible in the tracker below.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
