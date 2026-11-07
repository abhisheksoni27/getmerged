"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { MaintainerConsoleModal } from "@/components/MaintainerConsoleModal";

interface OrgClaimButtonProps {
  fullName: string;
}

export function OrgClaimButton({ fullName }: OrgClaimButtonProps) {
  const [claimed, setClaimed] = useState<boolean | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!fullName) return;
    let active = true;
    fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}/claim-status`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) setClaimed(Boolean(data?.is_claimed));
      })
      .catch(() => {
        if (active) setClaimed(false);
      });
    return () => {
      active = false;
    };
  }, [fullName]);

  if (claimed) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title={`Verify maintainer ownership of ${fullName}`}
        className="px-4 py-2 rounded-xl glass-panel hover:bg-emerald-950/70 border-emerald-800/80 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all border-2 border-[var(--border-subtle)] shadow-sm cursor-pointer"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        Claim this repo
      </button>
      <MaintainerConsoleModal
        fullName={fullName}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onVerificationSuccess={() => setClaimed(true)}
      />
    </>
  );
}
