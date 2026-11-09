"use client";

import React, { useState } from "react";
import { Crosshair, Sparkles } from "lucide-react";
import { IssueSniperModal } from "./IssueSniperModal";

interface IssueSniperTriggerProps {
  language?: string;
  repoFullName?: string;
  variant?: "button" | "banner";
}

export function IssueSniperTrigger({
  language = "",
  repoFullName = "",
  variant = "banner",
}: IssueSniperTriggerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (variant === "button") {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--purple-bright)] hover:brightness-110 text-[#04060A] font-mono text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Crosshair className="h-3.5 w-3.5" />
          <span>Snipe Fresh Issues</span>
        </button>
        <IssueSniperModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          defaultLanguage={language}
          defaultRepo={repoFullName}
        />
      </>
    );
  }

  return (
    <>
      <div className="card p-4 space-y-3 font-sans">
        <div className="tele-label flex items-center gap-1.5 text-xs">
          <Crosshair className="h-3.5 w-3.5 text-[var(--purple-bright)]" />
          <span>Issue Sniper Radar</span>
        </div>

        <div className="space-y-1">
          <h4 className="text-sm font-bold text-[var(--text-primary)] font-space leading-snug">
            {repoFullName
              ? `Snipe fresh issues in ${repoFullName}`
              : language
              ? `Snipe fresh ${language} beginner issues`
              : "Snipe top beginner issues before anyone claims them"}
          </h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Beginner tickets in welcoming repos get claimed quickly. Get pinged the minute a maintainer opens a new issue.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full py-2 px-3 rounded-lg bg-[var(--purple-bright)] hover:brightness-110 text-[#04060A] font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Arm Issue Sniper</span>
        </button>
      </div>

      <IssueSniperModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultLanguage={language}
        defaultRepo={repoFullName}
      />
    </>
  );
}
