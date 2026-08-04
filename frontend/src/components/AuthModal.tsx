"use client";

import React, { useEffect } from "react";
import { X, ShieldCheck, Flame, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
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
  description = "Sign in with GitHub to access daily trending repositories, page 2+ results, and detailed maintainer insights.",
  source = "modal",
}: AuthModalProps) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity animate-fade-in cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border-2 border-brand-dark z-10 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
          title="Close modal"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cream border-2 border-brand-dark shadow-[2px_2px_0px_#222831] mb-4">
            <Flame className="h-6 w-6 text-brand-dark fill-orange-500" />
          </div>

          <h3 className="text-xl font-space font-extrabold text-zinc-900 leading-tight">
            {title}
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-zinc-600 font-sans leading-relaxed">
            {description}
          </p>

          {/* Benefits Bullet Points */}
          <div className="mt-5 w-full space-y-2 text-left bg-zinc-50 rounded-xl p-3.5 border border-zinc-200/80 font-sans text-xs">
            <div className="flex items-center gap-2 text-zinc-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Access Daily Trending & High-Merge Repos</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Unlimited Pagination & Detailed Breakdown</span>
            </div>
          </div>

          {/* Primary GitHub OAuth Button */}
          <a
            href={`${API_BASE_URL}/api/v1/auth/github`}
            onClick={() => posthog.capture("github_sign_in_clicked", { source })}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3.5 text-sm font-bold text-white shadow-md hover:bg-zinc-800 active:scale-[0.98] transition-all cursor-pointer no-underline"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Continue with GitHub</span>
            <ArrowRight className="h-4 w-4 text-zinc-400" />
          </a>
        </div>
      </div>
    </div>
  );
}
