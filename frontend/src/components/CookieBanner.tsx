"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import posthog from "posthog-js";
import { getConsent, setConsent } from "@/lib/consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setVisible(true);
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
        <div className="rounded-2xl bg-zinc-900/95 backdrop-blur border border-zinc-700 text-zinc-100 p-5 sm:p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="h-5 w-5 text-[#dfd0b8] shrink-0 mt-0.5" />
              <div>
                <p className="font-space font-bold text-sm text-white">
                  We value your privacy
                </p>
                <p className="mt-1 text-xs text-zinc-300 leading-relaxed font-sans">
                  Opendoor uses an essential cookie to keep you signed in and
                  anonymized analytics (via PostHog) to improve the platform.
                  Analytics run only with your consent. See our{" "}
                  <Link href="/privacy" title="Read Opendoor Privacy Policy" className="underline text-white hover:text-[#dfd0b8] transition-colors">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={reject}
                className="rounded-xl border border-zinc-600 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={accept}
                className="rounded-xl bg-[#dfd0b8] px-4 py-2 text-xs font-bold text-zinc-900 hover:bg-[#efe6d4] transition-colors cursor-pointer"
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
