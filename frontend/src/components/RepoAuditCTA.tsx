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

export function RepoAuditCTA({ fullName, isScored, isLoggedIn, requireLogin }: RepoAuditCTAProps) {
  const router = useRouter();
  const [status, setStatus] = useState<AuditStatus>("none");

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

  if (status === "paid") {
    return (
      <Link
        href={`/${fullName}/audit`}
        title="View your full deep-audit report"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-mono font-medium text-emerald-400 shadow-sm transition-all hover:bg-emerald-500/20 cursor-pointer"
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
      className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-4 py-2 text-xs font-mono font-medium text-zinc-300 hover:text-white shadow-sm transition-all active:scale-[0.99] cursor-pointer"
    >
      {!isLoggedIn && <Lock className="h-3.5 w-3.5 text-zinc-300" />}
      <FileSearch className="h-3.5 w-3.5 text-orange-400" />
      <span>{label}</span>
    </button>
  );
}
