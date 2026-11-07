"use client";

import React from "react";
import { ShieldCheck, X } from "lucide-react";
import { useMaintainerConsoleForm } from "./maintainer-console/useMaintainerConsoleForm";
import { ErrorBanner } from "./maintainer-console/FormField";
import { ClaimTabPane } from "./maintainer-console/ClaimTabPane";
import { ConsoleTabPane } from "./maintainer-console/ConsoleTabPane";

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
  const {
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
  } = useMaintainerConsoleForm({ fullName, isOpen, isInitiallyVerified, onVerificationSuccess });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-surface)] backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] glass-panel rounded-3xl border border-[var(--border-subtle)] shadow-sm flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-[var(--border-subtle)] glass-panel flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black text-amber-400 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                Maintainer C-Rank Console
              </h2>
              <p className="text-xs text-[var(--text-secondary)] font-mono">{fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:glass-card rounded-xl transition-colors border border-transparent hover:border-[var(--border-subtle)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <ErrorBanner message={error} conflict={conflict} disputing={disputing} onDispute={fileDispute} />

          {activeTab === "claim" ? (
            <ClaimTabPane
              fullName={fullName}
              loading={loading}
              verifying={verifying}
              claimData={claimData}
              copied={copied}
              onCopy={copyNonce}
              onVerify={handleVerify}
            />
          ) : (
            <ConsoleTabPane
              fullName={fullName}
              consoleData={consoleData}
              rescoring={rescoring}
              rescore={rescore}
              onRescore={runRescore}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t-2 border-[var(--border-subtle)] glass-card flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Weekly rank-change reports sent automatically via email</span>
          <button
            onClick={onClose}
            className="px-4 py-2 glass-card text-[var(--text-primary)] rounded-xl font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
