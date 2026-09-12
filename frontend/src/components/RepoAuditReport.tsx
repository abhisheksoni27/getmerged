"use client";

import { useCallback, useEffect, useState } from "react";
import {
  API_BASE_URL,
  getRepoApiUrl,
  getRepoQueryUrl,
  getRepoAuditUrl,
  getRepoAuditCheckoutUrl,
  getRepoAuditRegenUrl,
} from "@/lib/api";
import { PAYMENTS_ENABLED } from "@/lib/flags";
import { AuditShell } from "./repo-audit/AuditShell";
import { AuditReportContent } from "./repo-audit/AuditReportContent";
import {
  AnalyzingView,
  CheckingView,
  ErrorView,
  NotFoundView,
  PayView,
  UnauthView,
} from "./repo-audit/PhaseViews";
import { useAuditPolling, type Phase } from "./repo-audit/useAuditPolling";
import type {
  ActionableTemplates,
  AuditAIInsights,
  AuditFactor,
  AuditReport,
  DeepSection,
  FrictionFingerprint,
  PRFunnel,
  PrioritizedFix,
  ReviewerHealth,
} from "./repo-audit/types";

export type {
  ActionableTemplates,
  AuditAIInsights,
  AuditFactor,
  AuditReport,
  DeepSection,
  FrictionFingerprint,
  PRFunnel,
  PrioritizedFix,
  ReviewerHealth,
};
export type { Phase };
export { AuditReportContent };
export { ANALYSIS_STEPS } from "./repo-audit/constants";

interface RepoAuditReportProps {
  owner: string;
  name: string;
  fullName: string;
}

export function RepoAuditReport({ owner, name, fullName }: RepoAuditReportProps) {
  const repoKey = fullName.toLowerCase();
  const [phase, setPhase] = useState<Phase>("checking");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [regenNote, setRegenNote] = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReport = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(getRepoAuditUrl(owner, name), {
        credentials: "include",
      });
      if (res.status === 403) return false;
      if (res.status === 404) {
        return false;
      }
      if (!res.ok) {
        setErrorMsg("Failed to load audit report.");
        setPhase("error");
        return true;
      }
      const data = (await res.json()) as AuditReport;
      setReport(data);
      setPhase("report");
      return true;
    } catch {
      setErrorMsg("Network error loading audit report.");
      setPhase("error");
      return true;
    }
  }, [owner, name]);

  const { startPolling, stopPolling } = useAuditPolling(repoKey, () => setPhase("analyzing"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Auth check: unauthenticated viewers cannot view the report.
      try {
        const me = await fetch(`${API_BASE_URL}/api/v1/auth/me`, { credentials: "include" });
        if (!me.ok) {
          if (!cancelled) setPhase("unauth");
          return;
        }
      } catch {
        if (!cancelled) setPhase("unauth");
        return;
      }
      const loaded = await fetchReport();
      if (cancelled) return;
      if (!loaded) {
        // Check if repo exists in opendoor DB first
        try {
          const repoCheck = await fetch(getRepoApiUrl(fullName));
          if (!repoCheck.ok && repoCheck.status === 404) {
            const searchCheck = await fetch(getRepoQueryUrl(fullName));
            if (searchCheck.ok) {
              const data = await searchCheck.json();
              const list = data.data || data.repos || [];
              const exists = Array.isArray(list) && list.some((r: { full_name?: string }) => r.full_name?.toLowerCase() === fullName.toLowerCase());
              if (!exists) {
                setPhase("notfound");
                return;
              }
            } else {
              setPhase("notfound");
              return;
            }
          }
        } catch {}

        setPhase("pay");
        startPolling();
      }
    })();
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [fetchReport, startPolling, stopPolling, owner, name, fullName]);

  const startCheckout = useCallback(async () => {
    if (!PAYMENTS_ENABLED) {
      setErrorMsg("Maintainer Audit checkout is temporarily paused during merchant verification. Please check back shortly or explore the free sample report.");
      return;
    }
    setCheckoutLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(getRepoAuditCheckoutUrl(owner, name), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        if (data.error === "unauthenticated") {
          setErrorMsg("Please sign in with your GitHub account to access maintainer audits.");
        } else if (data.error === "not_maintainer") {
          setErrorMsg("You need to be an admin maintainer of this repository to purchase an audit.");
        } else {
          setErrorMsg("Maintainer Audit checkout is temporarily unavailable. Please check back shortly.");
        }
        setCheckoutLoading(false);
        return;
      }
      const data = (await res.json()) as { checkout_url?: string };
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setErrorMsg("Checkout unavailable right now.");
      setCheckoutLoading(false);
    } catch {
      setErrorMsg("Network error starting checkout.");
      setCheckoutLoading(false);
    }
  }, [owner, name]);

  const regenerate = useCallback(async () => {
    if (!report) return;
    setRegenLoading(true);
    setRegenNote(null);
    try {
      const res = await fetch(getRepoAuditRegenUrl(owner, name), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        setRegenNote("Could not regenerate insights.");
        return;
      }
      const data = (await res.json()) as {
        regenerated: boolean;
        reason?: string;
        insights?: AuditAIInsights;
      };
      if (data.insights) {
        setReport((prev) =>
          prev ? { ...prev, ai_insights: data.insights as AuditAIInsights } : prev
        );
      }
      if (data.reason === "rate_limited") {
        setRegenNote("AI insights regenerate is limited to once per day - showing your cached report.");
      } else if (data.regenerated) {
        setRegenNote("AI insights regenerated.");
      }
    } catch {
      setRegenNote("Could not regenerate insights.");
    } finally {
      setRegenLoading(false);
    }
  }, [owner, name, report]);

  if (phase === "checking") {
    return <CheckingView fullName={fullName} />;
  }

  if (phase === "unauth") {
    return <UnauthView fullName={fullName} />;
  }

  if (phase === "notfound") {
    return <NotFoundView fullName={fullName} />;
  }

  if (phase === "error") {
    return <ErrorView fullName={fullName} errorMsg={errorMsg} />;
  }

  if (phase === "analyzing") {
    return <AnalyzingView fullName={fullName} onComplete={fetchReport} />;
  }

  if (phase === "pay") {
    return (
      <PayView
        fullName={fullName}
        errorMsg={errorMsg}
        checkoutLoading={checkoutLoading}
        onCheckout={startCheckout}
      />
    );
  }

  // phase === "report"
  const r = report as AuditReport;
  return (
    <AuditShell fullName={fullName}>
      <AuditReportContent report={r} onRegenerate={regenerate} regenLoading={regenLoading} regenNote={regenNote} />
    </AuditShell>
  );
}
