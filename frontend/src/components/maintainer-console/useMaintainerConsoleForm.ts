"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import {
  ClaimInitiateResponse,
  MaintainerConsolePayload,
  RescoreResult,
} from "@/types/opendoor";
import { getErrorMessage } from "./validation";

export type MaintainerTab = "claim" | "console";

interface UseMaintainerConsoleFormOptions {
  fullName: string;
  isOpen: boolean;
  isInitiallyVerified?: boolean;
  onVerificationSuccess?: () => void;
}

export function useMaintainerConsoleForm({
  fullName,
  isOpen,
  isInitiallyVerified = false,
  onVerificationSuccess,
}: UseMaintainerConsoleFormOptions) {
  const [activeTab, setActiveTab] = useState<MaintainerTab>(
    isInitiallyVerified ? "console" : "claim"
  );
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimData, setClaimData] = useState<ClaimInitiateResponse | null>(null);
  const [consoleData, setConsoleData] = useState<MaintainerConsolePayload | null>(null);
  const [rescoring, setRescoring] = useState(false);
  const [rescore, setRescore] = useState<RescoreResult | null>(null);
  const router = useRouter();

  const fetchConsole = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}/console`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load Maintainer Console");
      }
      setConsoleData(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load Maintainer Console"));
    } finally {
      setLoading(false);
    }
  }, [fullName]);

  const initiateClaim = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConflict(false);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}/claim`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setConflict(true);
          // AC5: duplicate claims resolve through the unique constraint - // the second claimant gets the 'already claimed' notice and is
          // redirected to their owner dashboard.
          setTimeout(() => {
            try {
              router.push("/dashboard");
            } catch {}
          }, 2500);
        }
        throw new Error(data.error || "Failed to initiate claim");
      }
      setClaimData(data);
      if (data.state === "verified" || data.org_verified) {
        setActiveTab("console");
        fetchConsole();
        onVerificationSuccess?.();
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not claim repository"));
    } finally {
      setLoading(false);
    }
  }, [fullName, fetchConsole, onVerificationSuccess, router]);

  const fileDispute = async () => {
    setDisputing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}/claim-dispute`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: `Disputing ownership claim on ${fullName}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not file dispute");
      setError(data.message || "Dispute submitted to the admin review queue.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not file dispute"));
    } finally {
      setDisputing(false);
    }
  };

  const runRescore = async () => {
    setRescoring(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}/rescore`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Re-score failed");
      if (data && data.status === "already_running") {
        // AC4: another re-score holds the repo lock; nothing failed.
        setError("A re-score for this repository is already running - try again in a moment.");
        return;
      }
      setRescore(data as RescoreResult);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Re-score failed"));
    } finally {
      setRescoring(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (isInitiallyVerified) {
        fetchConsole();
      } else {
        initiateClaim();
      }
    }
  }, [isOpen, isInitiallyVerified, fetchConsole, initiateClaim]);

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}/verify`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed. Please check the proof file.");
      }
      setActiveTab("console");
      fetchConsole();
      onVerificationSuccess?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Verification failed"));
    } finally {
      setVerifying(false);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const copyNonce = () => {
    if (claimData?.file_instructions?.file_content) {
      const text = claimData.file_instructions.file_content;
      if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
          fallbackCopy(text);
        });
      } else {
        fallbackCopy(text);
      }
    }
  };

  return {
    activeTab,
    loading,
    verifying,
    disputing,
    conflict,
    copied,
    error,
    claimData,
    consoleData,
    rescoring,
    rescore,
    fileDispute,
    runRescore,
    handleVerify,
    copyNonce,
  };
}
