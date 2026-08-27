"use client";

import React, { useEffect, useState } from "react";
import { Gift, Check, Copy } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface ReferralData {
  referral_code: string;
  referral_path: string;
  successful_invites: number;
  credits_earned: number;
}

export function ReferralCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/user/referral`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  const link = `${typeof window !== "undefined" ? window.location.origin : ""}${data.referral_path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <section
      id="referrals"
      className="max-w-4xl mx-auto px-4 mb-8 rounded-2xl glass-panel border-2 border-white/[0.1] shadow-sm p-5 sm:p-6 font-sans"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Gift className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-bold font-space text-white">Invite Friends, Earn Preflight Credits</h2>
      </div>
      <p className="text-xs text-zinc-300 mb-4">
        Share your link: when a friend signs up with GitHub through it, you get <strong>+3</strong> and they get{" "}
        <strong>+1</strong> bonus preflight-evaluation credit (up to 10 extra).
      </p>
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Your referral link"
          className="flex-1 min-w-0 rounded-xl border border-white/[0.12] glass-card px-3 py-2 text-xs font-mono text-zinc-300"
        />
        <button
          onClick={copy}
          title="Copy referral link"
          className="inline-flex items-center justify-center gap-2 rounded-xl glass-card hover:bg-zinc-800 text-white px-4 py-2 text-xs font-semibold cursor-pointer transition-all active:scale-[0.98]"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy Link
            </>
          )}
        </button>
      </div>
      {data.successful_invites > 0 && (
        <p className="mt-3 text-[11px] text-emerald-400 font-semibold">
          {data.successful_invites} friend{data.successful_invites === 1 ? "" : "s"} joined · +{data.credits_earned} evaluation credits earned
        </p>
      )}
    </section>
  );
}
