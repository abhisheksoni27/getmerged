import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/lib/api";

export interface MatchRepoItem {
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

export interface GoodFirstIssueItem {
  id: number | string;
  title: string;
  html_url: string;
  number?: number;
  comments_count?: number;
  created_at?: string;
}

export function useFirstMergeMatches(mounted: boolean) {
  const [matches, setMatches] = useState<MatchRepoItem[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

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

  return { matches, setMatches, loadingMatches };
}

export function useGoodFirstIssues(
  mounted: boolean,
  repoFullName: string | undefined,
  repoId: string | undefined,
  enabled: boolean = true
) {
  const [issues, setIssues] = useState<GoodFirstIssueItem[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const pollAttemptRef = { current: 0 };
  const pollTimerRef: { current: number | null } = { current: null };

  const fetchIssues = useCallback(() => {
    const repoIdentifier = repoFullName || repoId;
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
        const attempt = pollAttemptRef.current;
        if (attempt < 5) {
          const jitter = Math.floor(Math.random() * 500);
          const delay = Math.min(30000, Math.pow(2, attempt) * 1000 + jitter);
          pollAttemptRef.current += 1;
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
          pollTimerRef.current = setTimeout(() => {
            fetchIssues();
          }, delay) as unknown as number;
        }
      })
      .finally(() => {
        setLoadingIssues(false);
      });
  }, [repoFullName, repoId]);

  useEffect(() => {
    if (mounted && repoFullName && enabled) {
      fetchIssues();
    }
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [mounted, repoFullName, enabled, fetchIssues, pollTimerRef]);

  return { issues, setIssues, loadingIssues, issuesError, fetchIssues };
}
