"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyBadgeButtonProps {
  text: string;
}

export function CopyBadgeButton({ text }: CopyBadgeButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy markdown badge snippet"
      aria-label="Copy markdown badge snippet"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] text-xs font-mono font-semibold text-zinc-200 hover:text-white transition-colors cursor-pointer shrink-0"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 text-zinc-400" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}
