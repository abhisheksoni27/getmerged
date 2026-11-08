"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, FileCode2, Scale, ShieldCheck, Sparkles, Users } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { getGradeColor } from "@/components/CRankBadge";
import { RepoSectionTab } from "@/components/RepoStickyBar";
import { AIInsights, GoodFirstIssueItem, Repo } from "@/types/opendoor";
import posthog from "posthog-js";

export interface CurrentUser {
  username?: string;
  auth_provider?: string;
  has_github?: boolean;
}

interface UseRepoDetailOptions {
  repo: Repo | null;
  fullName: string;
  initialInsights?: AIInsights | null;
  initialRelatedRepos?: Repo[];
  initialGfiList?: GoodFirstIssueItem[];
  initialClaimStatus?: { is_claimed?: boolean; is_verified?: boolean } | null;
  onRequireAuth: (title: string, description: string, source: string) => void;
}

export function useRepoDetail({
  repo,
  fullName,
  initialInsights,
  initialRelatedRepos = [],
  initialGfiList = [],
  initialClaimStatus = null,
  onRequireAuth,
}: UseRepoDetailOptions) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [insights, setInsights] = useState<AIInsights | null>(initialInsights || null);
  const [isWatching, setIsWatching] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [githubNotFound, setGithubNotFound] = useState(false);
  const [isCheckingGithub, setIsCheckingGithub] = useState(false);
  const [relatedRepos, setRelatedRepos] = useState<Repo[]>(initialRelatedRepos);
  const [gfiList, setGfiList] = useState<GoodFirstIssueItem[]>(initialGfiList);
  const [isRepoClaimed, setIsRepoClaimed] = useState(Boolean(initialClaimStatus?.is_claimed));
  const [isRepoVerified, setIsRepoVerified] = useState(Boolean(initialClaimStatus?.is_verified));

  // Session fetch
  useEffect(() => {
    const hasToken = typeof document !== "undefined" && document.cookie.includes("opendoor_token=");
    if (!hasToken) return;
    fetch(`${API_BASE_URL}/api/v1/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const isLoggedIn = useMemo(
    () => Boolean(currentUser || (typeof document !== "undefined" && document.cookie.includes("opendoor_token="))),
    [currentUser]
  );
  const rank = useMemo(() => repo?.class_rank || repo?.c_rank_tier || "A", [repo?.class_rank, repo?.c_rank_tier]);
  const score = useMemo(() => repo?.c_rank_score ?? repo?.score ?? 0, [repo?.c_rank_score, repo?.score]);

  // GitHub existence check + queue for unscored repos
  useEffect(() => {
    if (!repo && fullName) {
      const parts = fullName.split("/");
      if (parts.length === 2) {
        setIsCheckingGithub(true);
        // Client-side fetch to GitHub API to check repository existence before queueing
        fetch(`https://api.github.com/repos/${parts[0]}/${parts[1]}`)
          .then((res) => {
            if (res.status === 404) {
              setGithubNotFound(true);
              setIsCheckingGithub(false);
              return null;
            }
            setIsCheckingGithub(false);
            return fetch(`${API_BASE_URL}/api/v1/repos/queue`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ owner: parts[0], name: parts[1] }),
            });
          })
          .then((res) => (res && res.ok ? res.json() : null))
          .then(() => {})
          .catch(() => {
            setIsCheckingGithub(false);
          });
      }
    }
  }, [repo, fullName]);

  // Watchlist / insights / related / claim-status / GFI refresh fetches
  useEffect(() => {
    const hasToken = typeof document !== "undefined" && document.cookie.includes("opendoor_token=");
    const targetId = repo?.id ? repo.id : (fullName ? encodeURIComponent(fullName) : "");

    const fetchWatchlist = async () => {
      if (!(hasToken && repo?.id)) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/user/watchlist`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.watchlist && Array.isArray(data.watchlist)) {
          const found = data.watchlist.some(
            (item: string | { repo_id: string }) =>
              typeof item === "string" ? item === String(repo.id) : String(item.repo_id) === String(repo.id)
          );
          setIsWatching(found);
        }
      } catch {}
    };

    const fetchInsights = async () => {
      if (!targetId || initialInsights) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/repos/${targetId}/insights`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.insights) setInsights(data.insights);
      } catch {}
    };

    const fetchRelated = async () => {
      if (!targetId || initialRelatedRepos.length > 0) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/repos/${targetId}/related?limit=3`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.related && Array.isArray(data.related)) setRelatedRepos(data.related);
      } catch {}
    };

    const fetchClaimStatus = async () => {
      if (!fullName || initialClaimStatus !== null) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}/claim-status`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.is_claimed) setIsRepoClaimed(true);
        if (data?.is_verified) setIsRepoVerified(true);
      } catch {}
    };

    const fetchGFI = async () => {
      if (!targetId) return;
      if (initialGfiList.length > 0) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/repos/${targetId}/good-first-issues`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.data && Array.isArray(data.data)) {
          setGfiList(data.data);
        }
      } catch {}
    };

    Promise.allSettled([fetchWatchlist(), fetchInsights(), fetchRelated(), fetchClaimStatus(), fetchGFI()]);
  }, [repo?.id, fullName, initialInsights, initialRelatedRepos.length, initialGfiList.length]);

  const handleWatchToggle = useCallback(async () => {
    if (!isLoggedIn) {
      onRequireAuth(
        "Watch Repository for Live Alerts",
        "Sign in with GitHub to add this repository to your watchlists and track maintainer response trends.",
        "watchlist"
      );
      return;
    }

    if (!repo?.id || watchLoading) return;
    setWatchLoading(true);

    try {
      if (isWatching) {
        const res = await fetch(`${API_BASE_URL}/api/v1/user/watchlist/${repo.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) {
          setIsWatching(false);
          posthog.capture('repo_watch_toggled', {
            action: 'unwatched',
            repo_full_name: fullName,
            repo_tier: rank,
          });
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/v1/user/watchlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ repo_id: repo.id }),
        });
        if (res.ok) {
          setIsWatching(true);
          posthog.capture('repo_watch_toggled', {
            action: 'watched',
            repo_full_name: fullName,
            repo_tier: rank,
          });
        }
      }
    } catch (e) {
      console.error("Failed to toggle watchlist", e);
    } finally {
      setWatchLoading(false);
    }
  }, [isLoggedIn, repo?.id, watchLoading, isWatching, fullName, rank, onRequireAuth]);

  // Derived display strings
  const responseTimeStr = useMemo(() => {
    if (repo?.time_to_first_response_hours !== undefined && repo.time_to_first_response_hours > 0) {
      if (repo.time_to_first_response_hours < 1) return "<1 hour";
      if (repo.time_to_first_response_hours < 24) return `${Math.floor(repo.time_to_first_response_hours)} hours`;
      return `${Math.floor(repo.time_to_first_response_hours / 24)} days+`;
    }
    return "-";
  }, [repo?.time_to_first_response_hours]);

  const responseCommentary = useMemo(() => {
    if (repo?.time_to_first_response_hours !== undefined && repo.time_to_first_response_hours > 0) {
      return repo.time_to_first_response_hours < 1
        ? "⚡ Fast reviewer response"
        : "Standard maintainer review cycle";
    }
    return "No reviewer activity recorded";
  }, [repo?.time_to_first_response_hours]);

  const mergeRateStr = useMemo(() => {
    return repo?.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate >= 0
      ? `${repo.external_pr_merge_rate.toFixed(1)}%`
      : "-";
  }, [repo?.external_pr_merge_rate]);

  const mergeCommentary = useMemo(() => {
    if (repo?.external_pr_merge_rate === undefined) return "Low or zero PR merges recorded";
    if (repo.external_pr_merge_rate > 75) return "High acceptance rate for external PRs";
    if (repo.external_pr_merge_rate > 30) return "Moderate PR acceptance rate";
    return "Selective PR acceptance rate";
  }, [repo?.external_pr_merge_rate]);

  const firstTimerSuccessStr = useMemo(() => {
    return repo?.first_timer_success_rate !== undefined && repo.first_timer_success_rate >= 0
      ? `${repo.first_timer_success_rate.toFixed(1)}%`
      : "-";
  }, [repo?.first_timer_success_rate]);

  const firstTimerCommentary = useMemo(() => {
    if (repo?.first_timer_success_rate !== undefined && repo.first_timer_success_rate > 50)
      return "Strong first-timer PR acceptance rate";
    if (repo?.first_timer_success_rate !== undefined && repo.first_timer_success_rate > 0)
      return "Accepts new contributor PRs";
    return "No first-timer merges recorded in window";
  }, [repo?.first_timer_success_rate]);

  const vibeScore = useMemo(() => {
    const responseTimeVal = repo?.time_to_first_response_hours || 0;
    const responseScore = responseTimeVal > 0 ? Math.max(0, 100 - (responseTimeVal * 2.5)) : 0;
    const mergeScore = repo?.external_pr_merge_rate || 0;
    const firstTimerScore = repo?.first_timer_success_rate || 0;
    return Math.round((mergeScore * 0.4) + (responseScore * 0.3) + (firstTimerScore * 0.3));
  }, [repo?.time_to_first_response_hours, repo?.external_pr_merge_rate, repo?.first_timer_success_rate]);

  const busFactor = useMemo(() => repo?.bus_factor ?? 0, [repo?.bus_factor]);

  const maintainersCommentary = useMemo(() => {
    const bf = repo?.bus_factor ?? 0;
    if (bf > 5) return "Highly collaborative maintainer core";
    if (bf > 1) return "Small core review team";
    if (bf === 1) return "Single maintainer review bottleneck";
    return "No active GitHub maintainers found (may review internally on Gerrit or internal tools)";
  }, [repo?.bus_factor]);

  const getRankHumanLabel = useCallback((r?: string) => getGradeColor(r).label, []);

  const tabs: RepoSectionTab[] = useMemo(() => [
    { id: "overview", label: "Overview", icon: Sparkles },
    { id: "scorecards", label: "Scorecards", icon: Activity },
    { id: "trends", label: "Historical Trends", icon: BarChart3 },
    { id: "good-first-issues", label: "Good First Issues", icon: ShieldCheck },
    { id: "community-feedback", label: "Contributor Reviews", icon: Users },
    ...(relatedRepos.length > 0 ? [{ id: "alternatives", label: "Similar Repos", icon: Scale }] : []),
    { id: "faqs", label: "FAQs & Guide", icon: FileCode2 },
  ], [relatedRepos.length]);

  // Scroll-spy
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowSticky(window.scrollY > 240);

      const sectionIds = tabs.map((t) => t.id);
      const scrollPos = window.scrollY + 170;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el) {
          const top = el.offsetTop;
          if (top <= scrollPos) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [tabs]);

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      const topOffset = el.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top: topOffset, behavior: "smooth" });
    }
  }, []);

  return {
    currentUser,
    insights,
    isWatching,
    watchLoading,
    githubNotFound,
    isCheckingGithub,
    relatedRepos,
    gfiList,
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
  };
}
