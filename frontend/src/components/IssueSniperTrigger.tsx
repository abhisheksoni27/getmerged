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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-md cursor-pointer"
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
      <div className="rounded-3xl glass-panel border border-emerald-500/30 p-6 sm:p-8 bg-gradient-to-r from-emerald-950/30 via-zinc-950/60 to-zinc-900/40 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
              <Crosshair className="h-3.5 w-3.5 animate-pulse" />
              <span>Real-Time Radar</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-space text-[var(--text-primary)]">
              {repoFullName
                ? `Snipe fresh beginner issues in ${repoFullName}`
                : language
                ? `Arm Issue Sniper for fresh ${language} beginner issues`
                : "Snipe top beginner issues before anyone claims them"}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Beginner issues in welcoming S/A-Tier repositories get snatched within 15 minutes.
              Receive instant alerts on Discord, Telegram, or Email the minute a maintainer opens a
              new task.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl shadow-emerald-950/60 cursor-pointer shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            <span>Arm Issue Sniper</span>
          </button>
        </div>
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
