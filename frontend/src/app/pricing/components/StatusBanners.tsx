import React from "react";
import { Sparkles } from "lucide-react";
import { PAYMENTS_ENABLED } from "@/lib/flags";

interface StatusBannersProps {
  isCheckoutSuccess: boolean;
  showVerificationNotice: boolean;
  noticeRef: React.RefObject<HTMLDivElement | null>;
}

export function StatusBanners({ isCheckoutSuccess, showVerificationNotice, noticeRef }: StatusBannersProps) {
  return (
    <>
      {isCheckoutSuccess && (
        <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/40 p-5 text-center max-w-2xl mx-auto ring-1 ring-emerald-500/30">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold mb-1.5">
            <Sparkles className="h-4 w-4" />
            <span>MEMBERSHIP ACTIVATED</span>
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] font-space">
            Welcome to GetMerged!
          </h3>
          <p className="text-xs text-[var(--text-secondary)] font-sans mt-1 leading-relaxed">
            Your payment succeeded and your plan entitlements are now active on your profile and dashboard.
          </p>
        </div>
      )}

      {!PAYMENTS_ENABLED && (
        <div
          ref={noticeRef}
          className={`rounded-2xl border transition-all duration-300 p-5 text-center max-w-2xl mx-auto ${
            showVerificationNotice
              ? "border-emerald-500 bg-emerald-950/60 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-950/50 scale-[1.02]"
              : "border-emerald-500/30 bg-emerald-950/20"
          }`}
        >
          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold mb-2">
            <Sparkles className="h-4 w-4" />
            <span>EARLY ACCESS PREVIEW</span>
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] font-space">
            Payment Processing Verification Underway
          </h3>
          <p className="text-xs text-[var(--text-secondary)] font-sans mt-1.5 leading-relaxed">
            Our merchant verification with Dodo Payments is completing. In the meantime, core features across GetMerged remain free to explore.
          </p>
        </div>
      )}
    </>
  );
}
