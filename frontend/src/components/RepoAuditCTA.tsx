"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSearch, Lock } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface RepoAuditCTAProps {
  fullName: string;
  isScored: boolean;
  isLoggedIn: boolean;
  requireLogin: () => void;
}

type AuditStatus = "loading" | "none" | "pending" | "paid" | "refunded" | "disputed" | "unauthenticated";

// RepoAuditCTA implements AC2/AC5: the "Get Full Audit" CTA is shown only when
// the repo exists (isScored) and the user has not purchased this repo. When
// unauthenticated, clicking forces signup/login (requireLogin); signed-in users
// are sent to the audit page which triggers checkout + polls for activation.
export function RepoAuditCTA({ fullName, isScored, isLoggedIn, requireLogin }: RepoAuditCTAProps) {
  const router = useRouter();
  const [status, setStatus] = useState<AuditStatus>("loading");

  const repoKey = fullName.toLowerCase();

  const checkStatus = useCallback(async () => {
    if (!isScored) {
      setStatus("none");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/audit/status?repo_key=${encodeURIComponent(repoKey)}`,
        { credentials: "include" }
      );
      if (res.status === 401) {
        setStatus("unauthenticated");
        return;
      }
      if (!res.ok) {
        setStatus("none");
        return;
      }
      const data = await res.json();
      setStatus((data?.status as AuditStatus) || "none");
    } catch {
      setStatus("none");
    }
  }, [isScored, repoKey]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  if (!isScored) return null;

  const goToAudit = () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    router.push(`/${fullName}/audit`);
  };

  // AC2: hide the purchase CTA once the user has purchased this repo.
  if (status === "paid") {
    return (
      <Link
        href={`/${fullName}/audit`}
        title="View your full deep-audit report"
        className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-dark bg-emerald-950/80 border-emerald-800/80 px-4 py-2 text-xs font-mono font-bold text-emerald-950 shadow-sm transition-all hover:bg-emerald-200 cursor-pointer"
      >
        <FileSearch className="h-4 w-4" />
        View Full Audit Report
      </Link>
    );
  }

  const label =
    status === "refunded" || status === "disputed"
      ? "Reactivate Full Audit - $19"
      : "Get Full Audit - $19";

  return (
    <button
      type="button"
      onClick={goToAudit}
      title={isLoggedIn ? "Unlock the full C-Rank deep-audit" : "Sign in to unlock the full deep-audit"}
      className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-dark bg-[#ffd93d] px-4 py-2 text-xs font-mono font-bold text-slate-50 shadow-sm transition-all hover:bg-[#ffdf5c] active:scale-[0.99] cursor-pointer"
    >
      {!isLoggedIn && <Lock className="h-4 w-4" />}
      <FileSearch className="h-4 w-4" />
      {status === "loading" ? "Audit…" : label}
    </button>
  );
}
