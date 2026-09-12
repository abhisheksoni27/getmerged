import { useState, useCallback, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";

export const MIGRATION_QUEUE_KEY = "opendoor_issue_claims_migrate_v1";
export const MIGRATION_DONE_KEY = "opendoor_issue_claims_migrated_v1";

export interface IssueClaimResponse {
  claim: {
    id: number;
    user_id: number;
    repo_full_name: string;
    issue_number: number;
    state: string;
    attribution_url: string;
    label_added: boolean;
  };
  comment_posted: boolean;
  label_added: boolean;
  skipped_existing: boolean;
  message: string;
}

export interface MigrationItem {
  fullName: string;
  issueNumber: number;
  title: string;
  url: string;
}

export function loadMigrationQueue(): MigrationItem[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(MIGRATION_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMigrationQueue(items: MigrationItem[]) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(MIGRATION_QUEUE_KEY, JSON.stringify(items));
    }
  } catch {
    // ignore
  }
}

export function seedMigrationFromLegacy() {
  try {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(MIGRATION_DONE_KEY)) return;
    const raw = localStorage.getItem("opendoor_first_merge_track_v1");
    if (!raw) {
      localStorage.setItem(MIGRATION_DONE_KEY, "1");
      return;
    }
    const state = JSON.parse(raw);
    const fullName = state?.selectedRepo?.fullName;
    const issueNumber = Number(state?.claimedIssue?.issueNumber ?? state?.claimedIssue?.id ?? 0);
    if (fullName && issueNumber > 0) {
      const queue = loadMigrationQueue();
      const exists = queue.some(
        (q) => q.fullName === fullName && q.issueNumber === issueNumber
      );
      if (!exists) {
        queue.push({
          fullName,
          issueNumber,
          title: state.claimedIssue?.title || "",
          url: state.claimedIssue?.url || "",
        });
        saveMigrationQueue(queue);
      }
    }
    localStorage.setItem(MIGRATION_DONE_KEY, "1");
  } catch {
    // ignore
  }
}

export async function postIssueClaim(fullName: string, issueNumber: number): Promise<IssueClaimResponse> {
  const [owner, name] = fullName.split("/");
  const res = await fetch(
    `${API_BASE_URL}/api/v1/issues/${encodeURIComponent(owner)}/${encodeURIComponent(
      name
    )}/${issueNumber}/claim`,
    { method: "POST", credentials: "include" }
  );
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (res.status === 401 || data.needs_github_auth) {
    const err = new Error(data.error ? String(data.error) : "github auth required") as Error & {
      needsAuth?: boolean;
    };
    err.needsAuth = true;
    throw err;
  }
  if (res.status === 429) {
    const err = new Error(data.error ? String(data.error) : "Rate limited") as Error & {
      rateLimited?: boolean;
    };
    err.rateLimited = true;
    throw err;
  }
  if (res.status >= 400) {
    throw new Error(data.error ? String(data.error) : `claim failed (${res.status})`);
  }
  return data as unknown as IssueClaimResponse;
}

export function useIssueClaims(isLoggedIn: boolean) {
  const [claimState, setClaimState] = useState<{
    posting: boolean;
    error: string | null;
    result: IssueClaimResponse | null;
  }>({ posting: false, error: null, result: null });
  const [serverClaimedKeys, setServerClaimedKeys] = useState<Set<string>>(new Set());
  const [needsGitHubAuth, setNeedsGitHubAuth] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

  const loadUserIssueClaims = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/issue-claims`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      const claims = Array.isArray(data?.claims) ? data.claims : [];
      const keys = new Set<string>();
      for (const c of claims) {
        if (c?.repo_full_name && c?.issue_number) {
          keys.add(`${c.repo_full_name}#${c.issue_number}`);
        }
      }
      setServerClaimedKeys(keys);
    } catch {
      // non-blocking
    }
  }, []);

  const migrateLocalClaims = useCallback(async () => {
    seedMigrationFromLegacy();
    let queue = loadMigrationQueue();
    if (queue.length === 0) {
      setMigrationStatus(null);
      return;
    }
    setMigrationStatus(`Migrating ${queue.length} saved claim(s)...`);
    const startedAt = Date.now();
    let sentThisMinute = 0;
    let lastSentAt = 0;
    while (queue.length > 0) {
      if (sentThisMinute >= 15 && Date.now() - startedAt < 60000) {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      const sinceLast = Date.now() - lastSentAt;
      if (sinceLast < 4000) {
        await new Promise((r) => setTimeout(r, 4000 - sinceLast));
      }
      const item = queue[0];
      try {
        await postIssueClaim(item.fullName, item.issueNumber);
        queue = queue.slice(1);
        saveMigrationQueue(queue);
        sentThisMinute += 1;
        lastSentAt = Date.now();
        setMigrationStatus(queue.length > 0 ? `Migrating ${queue.length} saved claim(s)...` : "Claims synced.");
      } catch (err) {
        const e = err as Error & { rateLimited?: boolean; needsAuth?: boolean };
        if (e.rateLimited) {
          setMigrationStatus("Rate limited - backing off before retrying...");
          await new Promise((r) => setTimeout(r, 60000));
          continue;
        }
        if (e.needsAuth) {
          setMigrationStatus("Sign in with GitHub to finish syncing saved claims.");
          setNeedsGitHubAuth(true);
          break;
        }
        queue = queue.slice(1);
        saveMigrationQueue(queue);
      }
    }
    if (queue.length === 0) {
      setMigrationStatus("Saved claims synced to your account.");
      try {
        if (typeof window !== "undefined") localStorage.removeItem(MIGRATION_QUEUE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadUserIssueClaims();
    migrateLocalClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  return {
    claimState,
    setClaimState,
    serverClaimedKeys,
    setServerClaimedKeys,
    needsGitHubAuth,
    setNeedsGitHubAuth,
    migrationStatus,
    postIssueClaim,
    loadUserIssueClaims,
    migrateLocalClaims,
  };
}
