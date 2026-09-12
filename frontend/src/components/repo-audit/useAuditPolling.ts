"use client";

import { useCallback, useEffect, useRef } from "react";
import { getRepoAuditStatusUrl } from "@/lib/api";
import { POLL_MS, POLL_TIMEOUT_MS } from "./constants";

export type Phase = "checking" | "unauth" | "report" | "pay" | "notfound" | "error" | "analyzing";

/** Polling state machine for post-checkout status: polls until paid, then fires onPaid. */
export function useAuditPolling(repoKey: string, onPaid: () => void) {
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineRef = useRef<number>(0);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  const pollStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(getRepoAuditStatusUrl(repoKey), {
        credentials: "include",
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { status?: string };
      return data.status === "paid";
    } catch {
      return false;
    }
  }, [repoKey]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    deadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
    const tick = async () => {
      if (Date.now() > deadlineRef.current) return;
      const paid = await pollStatus();
      if (paid) {
        // Show animated analysis before revealing report
        onPaidRef.current();
        return;
      }
      pollRef.current = setTimeout(tick, POLL_MS);
    };
    pollRef.current = setTimeout(tick, POLL_MS);
  }, [pollStatus]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { startPolling, stopPolling, pollStatus };
}
