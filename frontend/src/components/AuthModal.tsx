"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ShieldCheck, Flame, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { getReferralCode } from "@/lib/referral";
import posthog from "posthog-js";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  source?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  title = "Unlock Full Platform Telemetry",
  description = "Sign in with GitHub or Google to access daily trending repositories, page 2+ results, and detailed maintainer insights.",
  source = "modal",
}: AuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [refQS, setRefQS] = useState("");
  const [returnToQS, setReturnToQS] = useState("");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      if (currentPath && currentPath !== "/") {
        setReturnToQS(`return_to=${encodeURIComponent(currentPath)}`);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const ref = getReferralCode();
      const params = new URLSearchParams();
      if (ref) params.set("ref", ref);
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (currentPath && currentPath !== "/") {
          params.set("return_to", currentPath);
        }
      }
      const qs = params.toString();
      setRefQS(qs ? `?${qs}` : "");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 min-h-screen w-screen overflow-y-auto">
      {/* Blurred Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-fade-in cursor-pointer w-screen h-screen"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md my-auto rounded-3xl glass-panel p-7 sm:p-9 shadow-2xl border border-white/[0.1] z-10 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-zinc-300 hover:glass-card hover:text-zinc-300 transition-colors cursor-pointer"
          title="Close sign in dialog"
          aria-label="Close sign in dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 shadow-2xs mb-4">
            <Flame className="h-6 w-6 text-orange-600 fill-orange-500" />
          </div>

          <h3 className="text-xl sm:text-2xl font-space font-bold text-white leading-tight">
            {title}
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
            {description}
          </p>

          {/* Benefits Bullet Points */}
          <div className="mt-5 w-full space-y-2 text-left glass-card rounded-2xl p-4 border border-white/[0.1] font-sans text-xs">
            <div className="flex items-center gap-2.5 text-zinc-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Full Leaderboard & Page 2+ Pagination</span>
            </div>
            <div className="flex items-center gap-2.5 text-zinc-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Repository Watchlist & Velocity Alerts</span>
            </div>
            <div className="flex items-center gap-2.5 text-zinc-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Submit Contributor Review Scores</span>
            </div>
          </div>

          {/* OAuth Provider Action Buttons */}
          <div className="mt-6 w-full space-y-3 font-sans">
            {/* Primary GitHub OAuth Button */}
            <a
              href={`${API_BASE_URL}/api/v1/auth/github${refQS}`}
              onClick={() => posthog.capture("github_sign_in_clicked", { source })}
              title="Sign in with GitHub account"
              className="flex w-full items-center justify-center gap-3 rounded-2xl glass-card px-5 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 active:scale-[0.98] transition-all cursor-pointer no-underline group"
            >
              <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>Continue with GitHub</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-300 group-hover:translate-x-0.5 transition-transform" />
            </a>

            {/* Google OAuth Button */}
            <a
              href={`${API_BASE_URL}/api/v1/auth/google${returnToQS ? `?${returnToQS}` : ""}`}
              onClick={() => posthog.capture("google_sign_in_clicked", { source })}
              title="Sign in with Google account"
              className="flex w-full items-center justify-center gap-3 rounded-2xl glass-panel border border-white/[0.12] px-5 py-3.5 text-xs sm:text-sm font-semibold text-zinc-200 shadow-2xs hover:glass-card hover:border-white/[0.18] active:scale-[0.98] transition-all cursor-pointer no-underline group"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-300 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          <p className="mt-5 text-[11px] text-zinc-300 font-sans">
            By continuing, you agree to our Terms of Service & Privacy Policy.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
