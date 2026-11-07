"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import posthog from "posthog-js";
import { getConsent, setConsent } from "@/lib/consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() !== null) return;

    // Show only after user interaction (scroll, touch, click, keydown)
    const show = () => {
      setVisible(true);
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener("scroll", show);
      window.removeEventListener("pointerdown", show);
      window.removeEventListener("touchstart", show);
      window.removeEventListener("keydown", show);
    };

    window.addEventListener("scroll", show, { passive: true, once: true });
    window.addEventListener("pointerdown", show, { passive: true, once: true });
    window.addEventListener("touchstart", show, { passive: true, once: true });
    window.addEventListener("keydown", show, { passive: true, once: true });

    return cleanup;
  }, []);

  if (!visible) return null;

  const accept = () => {
    setConsent("accepted");
    posthog.opt_in_capturing();
    setVisible(false);
  };

  const reject = () => {
    setConsent("rejected");
    posthog.opt_out_capturing();
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] animate-fade-slide-up">
      <div className="mx-auto mb-4 px-4 max-w-7xl">
        <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] p-5 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="h-5 w-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
              <div>
                <p className="font-display font-bold text-sm text-[var(--text-primary)]">
                  We value your privacy
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                  GetMerged uses an essential cookie to keep you signed in and
                  anonymized analytics (via PostHog) to improve the platform.
                  Analytics run only with your consent. See our{" "}
                  <Link prefetch={false} href="/privacy" title="Read GetMerged Privacy Policy" className="underline text-[var(--text-primary)] hover:text-[var(--color-primary)] transition-colors">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={reject}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={accept}
                className="rounded-xl bg-[var(--text-primary)] px-4 py-2 text-xs font-bold text-[var(--bg-canvas)] hover:bg-[var(--color-neutral-800)] shadow-sm transition-colors cursor-pointer"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
