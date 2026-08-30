"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Zap,
  Check,
  Send,
  Radio,
  Clock,
  ChevronRight,
  Flame,
  Bot,
} from "lucide-react";

interface GfiSniperCardProps {
  isPro?: boolean;
  defaultEmail?: string;
}

export function GfiSniperCard({ isPro = false, defaultEmail = "" }: GfiSniperCardProps) {
  const [channel, setChannel] = useState<"telegram" | "discord" | "email">("telegram");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["TypeScript", "Go"]);
  const [frequency, setFrequency] = useState<"instant" | "daily">(isPro ? "instant" : "daily");
  const [isSaved, setIsSaved] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const availableLangs = ["TypeScript", "Go", "Rust", "Python", "C++", "Java", "Ruby"];

  const toggleLang = (lang: string) => {
    if (selectedLangs.includes(lang)) {
      if (selectedLangs.length > 1) {
        setSelectedLangs(selectedLangs.filter((l) => l !== lang));
      }
    } else {
      setSelectedLangs([...selectedLangs, lang]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSendTest = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="rounded-3xl glass-panel border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-zinc-950/80 to-zinc-900/50 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>Good First Issue Sniper · Instant Alert Radar</span>
          </div>
          <h3 className="text-xl font-bold font-space text-white">
            Never Miss a Beginner Issue in Your Tech Stack
          </h3>
          <p className="text-xs text-zinc-400 font-sans">
            Good first issues get claimed within minutes. The Sniper notifies you on Telegram, Discord, or Email the second a maintainer labels one.
          </p>
        </div>

        <span className="glass-card px-3 py-1 rounded-xl text-xs font-mono text-cyan-400 shrink-0 self-start sm:self-auto flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-amber-400" /> &lt;30s Latency
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-5 font-sans">
        {/* Step 1: Destination Channel */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
            1. Select Alert Destination:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setChannel("telegram")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                channel === "telegram"
                  ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-950/40"
                  : "glass-card border-white/[0.08] text-zinc-400 hover:text-white"
              }`}
            >
              <Send className="h-5 w-5 text-blue-400 shrink-0" />
              <div>
                <div className="text-xs font-bold font-mono">Telegram Bot</div>
                <div className="text-[11px] text-zinc-400">Direct instant DM</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChannel("discord")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                channel === "discord"
                  ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-950/40"
                  : "glass-card border-white/[0.08] text-zinc-400 hover:text-white"
              }`}
            >
              <Bot className="h-5 w-5 text-indigo-400 shrink-0" />
              <div>
                <div className="text-xs font-bold font-mono">Discord Webhook</div>
                <div className="text-[11px] text-zinc-400">Server channel alert</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChannel("email")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                channel === "email"
                  ? "bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-950/40"
                  : "glass-card border-white/[0.08] text-zinc-400 hover:text-white"
              }`}
            >
              <Bell className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold font-mono">Email Digest</div>
                <div className="text-[11px] text-zinc-400">Inbox summary</div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Channel Input Details */}
        <div className="p-4 rounded-2xl bg-[#09090b] border border-white/[0.08] space-y-3">
          {channel === "telegram" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <label className="text-zinc-300 font-semibold">Your Telegram Username or Chat ID:</label>
                <a
                  href="https://t.me/GetMergedSniperBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>Start @GetMergedSniperBot</span>
                  <ChevronRight className="h-3 w-3" />
                </a>
              </div>
              <input
                type="text"
                value={telegramHandle}
                onChange={(e) => setTelegramHandle(e.target.value)}
                placeholder="@your_telegram_username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.1] text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}

          {channel === "discord" && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-300 font-semibold">Discord Channel Webhook URL:</label>
              <input
                type="url"
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.1] text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}

          {channel === "email" && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-300 font-semibold">Alert Email Address:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.1] text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Step 3: Target Languages */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
            2. Monitored Languages & Ecosystems:
          </label>
          <div className="flex flex-wrap gap-2">
            {availableLangs.map((lang) => {
              const active = selectedLangs.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                    active
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "glass-card border-white/[0.08] text-zinc-400 hover:text-white"
                  }`}
                >
                  {active ? `✓ ${lang}` : lang}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Speed Frequency (Pro Upsell Trigger) */}
        <div className="p-4 rounded-2xl glass-card border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span>Sniper Alert Latency:</span>
            </div>
            <p className="text-xs text-zinc-400">
              Free accounts receive daily batch summaries. Pro members get instant sub-minute push alerts.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-[#09090b] rounded-xl border border-white/[0.1] font-mono text-xs shrink-0">
            <button
              type="button"
              onClick={() => setFrequency("daily")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                frequency === "daily" ? "bg-white/[0.1] text-white font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              Daily Digest (Free)
            </button>
            <button
              type="button"
              onClick={() => setFrequency("instant")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                frequency === "instant"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow-md shadow-cyan-950/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Zap className="h-3 w-3 text-amber-300" />
              <span>Instant Real-Time (Pro)</span>
            </button>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={handleSendTest}
            className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            {testSent ? (
              <span className="text-emerald-400">✓ Test alert dispatched!</span>
            ) : (
              <span>Send Sample Test Alert</span>
            )}
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Link
              href="/pricing?tab=contributors"
              className="text-xs font-mono text-cyan-400 hover:underline"
            >
              Unlock Unlimited Repos ($9/mo)
            </Link>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-cyan-950/40 cursor-pointer active:scale-[0.98]"
            >
              {isSaved ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" />
                  <span>Sniper Active!</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Activate Sniper Radar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
