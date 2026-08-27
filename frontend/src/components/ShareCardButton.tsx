"use client";

import { useCallback, useRef, useState } from "react";

type Toast = { kind: "success" | "error" | "info"; msg: string } | null;

interface ShareCardButtonProps {
  slug: string;
  username: string;
}

function shareUrl(slug: string): string {
  if (typeof window === "undefined") return `https://getmerged.com/u/${slug}`;
  return `${window.location.origin}/u/${slug}`;
}

function copyFallback(text: string): boolean {
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to execCommand */
  }
  return copyFallback(text);
}

export default function ShareCardButton({ slug, username }: ShareCardButtonProps) {
  const [toast, setToast] = useState<Toast>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: Toast) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(t);
    if (t) {
      timer.current = setTimeout(() => setToast(null), 3200);
    }
  }, []);

  const onShare = useCallback(async () => {
    const url = shareUrl(slug);
    const title = `${username} on GetMerged`;
    const text = `Check out my verified open-source contributor report card on GetMerged - every merge proven. ${url}`;

    // Tier 1: Web Share API when available.
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        showToast({ kind: "success", msg: "Shared your report card." });
        return;
      }
    } catch (err) {
      // User cancelled (AbortError) -> stay silent; any other failure -> next tier.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }

    // Tier 2: X / LinkedIn intent via window.open.
    try {
      const intent =
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}` +
        `&url=${encodeURIComponent(url)}`;
      const win = typeof window !== "undefined" ? window.open(intent, "_blank", "noopener,noreferrer") : null;
      if (win) {
        showToast({ kind: "success", msg: "Opening X to share your card…" });
        return;
      }
      // Popup blocked -> clipboard fallback.
    } catch {
      /* fall through to clipboard */
    }

    // Tier 3: clipboard with execCommand fallback.
    const ok = await copyToClipboard(url);
    if (ok) {
      showToast({ kind: "success", msg: "Card link copied to clipboard." });
    } else {
      showToast({ kind: "error", msg: "Couldn't share - copy this link: " + url });
    }
  }, [slug, username, showToast]);

  return (
    <>
      <button
        type="button"
        onClick={onShare}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        aria-label="Share my report card"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share my card
      </button>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg ${
            toast.kind === "error"
              ? "border-red-300 bg-red-50 text-red-800"
              : toast.kind === "info"
                ? "border-white/[0.12] bg-zinc-900/80 text-zinc-200"
                : "border-emerald-300 bg-emerald-950/70 border-emerald-800/80 text-emerald-300"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}
