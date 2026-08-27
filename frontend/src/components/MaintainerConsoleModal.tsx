"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  FileCode,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import {
  MaintainerConsolePayload,
  ClaimInitiateResponse,
  MaintainerChecklistItem,
  RescoreResult,
} from "@/types/opendoor";

interface MaintainerConsoleModalProps {
  fullName: string;
  isOpen: boolean;
  onClose: () => void;
  isInitiallyVerified?: boolean;
  onVerificationSuccess?: () => void;
}

export function MaintainerConsoleModal({
  fullName,
  isOpen,
  onClose,
  isInitiallyVerified = false,
  onVerificationSuccess,
}: MaintainerConsoleModalProps) {
  const [activeTab, setActiveTab] = useState<"claim" | "console">(
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
      const message = err instanceof Error ? err.message : "Failed to load Maintainer Console";
      setError(message);
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
      const message = err instanceof Error ? err.message : "Could not claim repository";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fullName, fetchConsole, onVerificationSuccess]);

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
      const message = err instanceof Error ? err.message : "Could not file dispute";
      setError(message);
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
      const message = err instanceof Error ? err.message : "Re-score failed";
      setError(message);
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
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setVerifying(false);
    }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#111827] rounded-3xl border border-white/[0.12] shadow-sm flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/[0.08] glass-panel flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black text-amber-400 rounded-2xl border border-white/[0.12] shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                Maintainer C-Rank Console
              </h2>
              <p className="text-xs text-zinc-400 font-mono">{fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-[#1e293b] rounded-xl transition-colors border border-transparent hover:border-white/[0.08] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex items-start gap-3 text-red-900 text-sm font-medium">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                {error}
                {conflict && (
                  <div className="mt-3 pt-3 border-t border-red-200 text-xs text-zinc-400">
                    Think you are the rightful maintainer?{" "}
                    <button
                      onClick={fileDispute}
                      disabled={disputing}
                      className="font-bold text-red-700 hover:text-red-800 underline underline-offset-2 cursor-pointer disabled:opacity-50"
                    >
                      {disputing ? "Submitting..." : "Report a dispute"}
                    </button>{" "}
                    for admin review - ownership is never transferred automatically.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "claim" && (
            <div className="space-y-6">
              <div className="bg-[#1e293b] p-5 rounded-2xl border border-white/[0.08] text-sm text-zinc-300 leading-relaxed">
                <p className="font-semibold text-zinc-100 mb-1">
                  Verify ownership of <span className="font-mono text-blue-600">{fullName}</span>
                </p>
                <p>
                  Claiming this repository unlocks the Maintainer Console, showing your real-time
                  C-Rank breakdown and prioritized actions to increase your project’s welcoming score.
                </p>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-zinc-100" />
                  <span className="text-sm font-medium">Generating verification token...</span>
                </div>
              ) : claimData?.file_instructions ? (
                <div className="space-y-4">
                  <div className="border border-white/[0.12] rounded-2xl p-4 bg-amber-950/70 border-amber-800/80/60 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <FileCode className="w-4 h-4 text-amber-600" /> Method 1: Proof File (Recommended)
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 bg-[#111827] px-2 py-0.5 rounded-md border border-white/[0.08]">
                        Expires in 24 hours
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-3">
                      Create a file named <code className="px-1.5 py-0.5 bg-[#111827] border border-white/[0.12] rounded font-mono font-bold text-zinc-100">{claimData.file_instructions.file_name}</code> in your repository root with this exact content:
                    </p>
                    <div className="relative bg-[#1e293b] text-emerald-400 p-3.5 rounded-xl font-mono text-xs break-all flex items-center justify-between border border-white/[0.08]">
                      <code>{claimData.file_instructions.file_content}</code>
                      <button
                        onClick={copyNonce}
                        className="ml-3 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-sans font-medium flex items-center gap-1 shrink-0 border border-zinc-700 cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="border border-white/[0.08] rounded-2xl p-4 bg-[#1e293b] flex items-center justify-between text-xs text-zinc-400">
                    <span>Or verify automatically if your GitHub account has push/admin permission on this repository.</span>
                    <span className="font-mono font-bold text-zinc-100">Automatic on GitHub Login</span>
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-100 font-bold text-sm rounded-2xl border border-white/[0.12] shadow-sm hover:shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Verifying File on GitHub...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Check &amp; Verify Ownership
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === "console" && consoleData && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Score Header Banner */}
              <div className="p-5 bg-[#1e293b] text-white rounded-3xl border border-white/[0.12] shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Current Health Score</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-white">{Math.round(consoleData.c_rank_score)}</span>
                    <span className="text-zinc-400 text-sm">/100</span>
                    <span className={`ml-2 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono border text-zinc-100 ${
                      consoleData.c_rank_tier === "S"
                        ? "bg-[#8ce99a] border-emerald-500"
                        : consoleData.c_rank_tier === "A"
                        ? "bg-[#bfdbff] border-blue-400"
                        : consoleData.c_rank_tier === "B"
                        ? "bg-[#ffd93d] border-amber-400"
                        : consoleData.c_rank_tier === "C"
                        ? "bg-[#e5dbff] border-purple-400"
                        : "bg-[#ffb3c7] border-rose-400"
                    }`}>
                      Tier {consoleData.c_rank_tier}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/40">
                    <ShieldCheck className="w-4 h-4" /> Verified Maintainer
                  </span>
                </div>
              </div>

              {/* Automated re-score + before/after card (AC3, AC4) */}
              <div className="p-4 bg-[#111827] border border-white/[0.12] rounded-2xl shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" /> Automated Re-score
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Recompute your C-Rank from the last 180 days of telemetry and issue a
                      before/after share card on improvement.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runRescore}
                    disabled={rescoring}
                    className="px-4 py-2.5 bg-[#1e293b] hover:bg-zinc-800 text-white font-bold text-xs rounded-xl border border-white/[0.12] shadow-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                  >
                    {rescoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Re-scoring...
                      </>
                    ) : (
                      "Re-score now"
                    )}
                  </button>
                </div>

                {rescore && !rescore.rate_limited && (
                  <div
                    className={`mt-4 p-4 rounded-xl border-2 ${
                      rescore.outcome === "improved"
                        ? "bg-emerald-950/70 border-emerald-800/80 border-emerald-400"
                        : "bg-[#1e293b] border-white/[0.12]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-sm font-bold text-zinc-100">
                        <span className="text-zinc-400">before</span> {Math.round(rescore.before_score)}
                        {rescore.before_tier ? ` (${rescore.before_tier})` : ""}
                        {" → "}
                        <span className={rescore.outcome === "improved" ? "text-emerald-400" : ""}>
                          after {Math.round(rescore.after_score)}
                        </span>
                        {rescore.after_tier ? ` (${rescore.after_tier})` : ""}
                      </div>
                      <span className="px-2 py-0.5 rounded-lg font-mono text-xs font-bold border border-white/[0.12] bg-[#111827] text-zinc-300">
                        {rescore.outcome.replace(/_/g, " ")}
                      </span>
                    </div>
                    {rescore.card_issued && (
                      <a
                        href={
                          rescore.card_url
                            ? `${API_BASE_URL}${rescore.card_url}`
                            : `${API_BASE_URL}/og/playbook/${fullName}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2 cursor-pointer"
                      >
                        View shareable before/after OG card <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {!rescore.card_issued && rescore.outcome !== "improved" && (
                      <p className="mt-2 text-xs text-zinc-400">
                        No improvement yet - close a playbook gap and re-score to earn the
                        before/after card.
                      </p>
                    )}
                  </div>
                )}
                {rescore?.rate_limited && (
                  <p className="mt-3 text-xs text-zinc-400">
                    Card cooldown active - next card available at{" "}
                    {rescore.next_allowed_at ? new Date(rescore.next_allowed_at).toLocaleString() : "later"}.
                  </p>
                )}
              </div>

              {/* Actionable Checklist (AC6) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Prioritized Actions to Raise C-Rank
                  </h3>
                  <span className="text-xs font-mono text-zinc-400">Top 5 high-impact fixes</span>
                </div>

                <div className="space-y-3">
                  {consoleData.checklist && consoleData.checklist.length > 0 ? (
                    consoleData.checklist.map((item: MaintainerChecklistItem) => (
                      <div
                        key={item.id}
                        className="p-4 bg-[#111827] border border-white/[0.12] rounded-2xl shadow-sm hover:border-white/[0.08] transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="font-bold text-sm text-zinc-100">{item.title}</div>
                          <span className="px-2.5 py-0.5 bg-emerald-950/80 border-emerald-800/80 text-emerald-300 font-mono text-xs font-bold rounded-lg border border-emerald-300 shrink-0">
                            +{item.impact_pts} pts
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mb-2 leading-relaxed">{item.description}</p>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.08]">
                          <span className="text-zinc-400 font-mono text-[11px] bg-[#1e293b] px-2 py-0.5 rounded">
                            {item.fix_guidance}
                          </span>
                          {item.link_url && (
                            <a
                              href={item.link_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 ml-2 shrink-0"
                            >
                              Fix Guide <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 bg-emerald-950/70 border-emerald-800/80 border-2 border-emerald-400 rounded-2xl text-center text-emerald-300 text-sm font-medium">
                      🎉 Outstanding work! All prime welcoming metrics are currently optimized.
                    </div>
                  )}
                </div>
              </div>

              {/* Metric Breakdown Details */}
              <div>
                <h3 className="text-sm font-bold text-zinc-100 mb-3">Live Telemetry Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-3 bg-[#1e293b] border border-white/[0.08] rounded-xl">
                    <span className="text-zinc-400 block text-[10px] uppercase">Review Latency p50</span>
                    <span className="font-bold text-zinc-100 text-sm">{consoleData.breakdown.response_p50_hours ? `${consoleData.breakdown.response_p50_hours.toFixed(1)}h` : "N/A"}</span>
                  </div>
                  <div className="p-3 bg-[#1e293b] border border-white/[0.08] rounded-xl">
                    <span className="text-zinc-400 block text-[10px] uppercase">First-PR Merge Rate</span>
                    <span className="font-bold text-zinc-100 text-sm">{consoleData.breakdown.first_timer_success_rate ? `${consoleData.breakdown.first_timer_success_rate.toFixed(0)}%` : "0%"}</span>
                  </div>
                  <div className="p-3 bg-[#1e293b] border border-white/[0.08] rounded-xl">
                    <span className="text-zinc-400 block text-[10px] uppercase">Overall PR Merge Rate</span>
                    <span className="font-bold text-zinc-100 text-sm">{consoleData.breakdown.external_pr_merge_rate ? `${consoleData.breakdown.external_pr_merge_rate.toFixed(0)}%` : "0%"}</span>
                  </div>
                  <div className="p-3 bg-[#1e293b] border border-white/[0.08] rounded-xl">
                    <span className="text-zinc-400 block text-[10px] uppercase">Good First Issues</span>
                    <span className="font-bold text-zinc-100 text-sm">{consoleData.breakdown.good_first_issue_count}</span>
                  </div>
                  <div className="p-3 bg-[#1e293b] border border-white/[0.08] rounded-xl">
                    <span className="text-zinc-400 block text-[10px] uppercase">Onboarding Docs</span>
                    <span className="font-bold text-zinc-100 text-sm">{consoleData.breakdown.onboarding_score}/100</span>
                  </div>
                  <div className="p-3 bg-[#1e293b] border border-white/[0.08] rounded-xl">
                    <span className="text-zinc-400 block text-[10px] uppercase">90-Day Bus Factor</span>
                    <span className="font-bold text-zinc-100 text-sm">{consoleData.breakdown.bus_factor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t-2 border-white/[0.08] bg-[#1e293b] flex items-center justify-between text-xs text-zinc-400">
          <span>Weekly rank-change reports sent automatically via email</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1e293b] text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
