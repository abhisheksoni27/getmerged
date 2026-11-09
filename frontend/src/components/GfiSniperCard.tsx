"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Zap,
  Check,
  Send,
  Radio,
  Clock,
  Flame,
  Bot,
  AlertCircle,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface GfiSniperCardProps {
  defaultEmail?: string;
}

export function GfiSniperCard({ defaultEmail = "" }: GfiSniperCardProps) {
  const [channel, setChannel] = useState<"discord" | "webhook" | "email">("discord");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["TypeScript", "Go"]);
  const [frequency, setFrequency] = useState<"instant" | "weekly">("instant");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableLangs = ["TypeScript", "Go", "Rust", "Python", "C++", "Java", "Ruby"];

  useEffect(() => {
    // Load existing sniper subscription if signed in
    fetch(`${API_BASE_URL}/api/v1/alerts/my-snipers`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.subscriptions && data.subscriptions.length > 0) {
          const sub = data.subscriptions[0];
          if (sub.webhook_url) setWebhookUrl(sub.webhook_url);
          if (sub.email) setEmail(sub.email);
          if (sub.languages && Array.isArray(sub.languages) && sub.languages.length > 0) {
            setSelectedLangs(sub.languages);
          }
          if (sub.channel === "discord" || sub.channel === "webhook" || sub.channel === "email") {
            setChannel(sub.channel);
          }
          if (sub.frequency === "instant" || sub.frequency === "weekly") {
            setFrequency(sub.frequency);
          }
        }
      })
      .catch(() => {});
  }, []);

  const toggleLang = (lang: string) => {
    if (selectedLangs.includes(lang)) {
      if (selectedLangs.length === 1) return; // Keep at least one
      setSelectedLangs(selectedLangs.filter((l) => l !== lang));
    } else {
      setSelectedLangs([...selectedLangs, lang]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaveSuccess(false);

    if (channel === "discord" || channel === "webhook") {
      if (!webhookUrl.startsWith("https://")) {
        setErrorMsg("Please enter a valid HTTPS webhook URL");
        return;
      }
    } else if (channel === "email") {
      if (!email.includes("@")) {
        setErrorMsg("Please enter a valid email address");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/alerts/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channel,
          webhook_url: channel === "email" ? "" : webhookUrl,
          email: channel === "email" ? email : "",
          languages: selectedLangs,
          frequency,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save alert preferences");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to activate sniper");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!webhookUrl) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/alerts/test-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channel,
          webhook_url: webhookUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTestResult({ success: true, message: "Test alert dispatched! Check your channel." });
      } else {
        setTestResult({ success: false, message: data.error || "Test dispatch failed." });
      }
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : "Delivery failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="card p-5 sm:p-6 space-y-5 relative overflow-hidden font-sans">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[rgba(13,150,104,0.12)] border border-[rgba(13,150,104,0.3)] text-[#0D9668] text-[11px] font-mono font-semibold">
            <Radio className="h-3 w-3 animate-pulse" />
            <span>Webhook Radar</span>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-tertiary)] flex items-center gap-1">
            <Flame className="h-3 w-3 text-[#C4910A]" /> Instant Alert
          </span>
        </div>
        <h3 className="text-base sm:text-lg font-bold font-space text-[var(--text-primary)] tracking-tight">
          Never Miss a Beginner Issue in Your Tech Stack
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Beginner tickets get claimed quickly. Get direct alerts to your Discord, Telegram bridge, or custom webhook.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        {/* Step 1: Alert Destination - Compact segmented buttons */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
            1. Alert Destination
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setChannel("discord")}
              className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                channel === "discord"
                  ? "bg-[#161B26] border-[var(--purple-bright)] text-[var(--text-primary)] shadow-xs"
                  : "bg-[#0D111A] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
              }`}
            >
              <Bot className="h-4 w-4 text-[#5865F2] shrink-0" />
              <div className="truncate">
                <div className="text-xs font-semibold leading-tight truncate">Discord</div>
                <div className="text-[10px] text-[var(--text-tertiary)] truncate">Webhook URL</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChannel("webhook")}
              className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                channel === "webhook"
                  ? "bg-[#161B26] border-[var(--purple-bright)] text-[var(--text-primary)] shadow-xs"
                  : "bg-[#0D111A] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
              }`}
            >
              <Send className="h-4 w-4 text-[#229ED9] shrink-0" />
              <div className="truncate">
                <div className="text-xs font-semibold leading-tight truncate">Telegram / Hook</div>
                <div className="text-[10px] text-[var(--text-tertiary)] truncate">Custom HTTPS</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChannel("email")}
              className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                channel === "email"
                  ? "bg-[#161B26] border-[var(--purple-bright)] text-[var(--text-primary)] shadow-xs"
                  : "bg-[#0D111A] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
              }`}
            >
              <Bell className="h-4 w-4 text-[var(--purple-bright)] shrink-0" />
              <div className="truncate">
                <div className="text-xs font-semibold leading-tight truncate">Email</div>
                <div className="text-[10px] text-[var(--text-tertiary)] truncate">Inbox digest</div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Channel Input Details */}
        <div className="space-y-1.5">
          {channel === "discord" && (
            <>
              <label className="text-[11px] font-mono text-[var(--text-secondary)] font-semibold block">
                Discord Webhook URL:
              </label>
              <input
                type="url"
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-3 py-2 rounded-lg bg-[#0D111A] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:[var(--text-tertiary)] text-xs font-mono focus:border-[var(--purple-bright)] focus:outline-none transition-colors"
              />
            </>
          )}

          {channel === "webhook" && (
            <>
              <label className="text-[11px] font-mono text-[var(--text-secondary)] font-semibold block">
                Telegram Bridge or Webhook URL (HTTPS):
              </label>
              <input
                type="url"
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook or Telegram bot bridge"
                className="w-full px-3 py-2 rounded-lg bg-[#0D111A] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:[var(--text-tertiary)] text-xs font-mono focus:border-[var(--purple-bright)] focus:outline-none transition-colors"
              />
            </>
          )}

          {channel === "email" && (
            <>
              <label className="text-[11px] font-mono text-[var(--text-secondary)] font-semibold block">
                Alert Email Address:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full px-3 py-2 rounded-lg bg-[#0D111A] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:[var(--text-tertiary)] text-xs font-mono focus:border-[var(--purple-bright)] focus:outline-none transition-colors"
              />
            </>
          )}
        </div>

        {/* Step 3: Target Languages */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
            2. Monitored Languages
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableLangs.map((lang) => {
              const active = selectedLangs.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all cursor-pointer border ${
                    active
                      ? "bg-[rgba(163,113,247,0.18)] text-[var(--purple-bright)] border-[var(--border-accent)] font-semibold"
                      : "bg-[#0D111A] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                  }`}
                >
                  {active ? `✓ ${lang}` : lang}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Dispatch Frequency */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-mono">
            <Clock className="h-3.5 w-3.5 text-[var(--purple-bright)]" />
            <span>Frequency:</span>
          </div>
          <div className="inline-flex items-center gap-1 p-0.5 bg-[#0D111A] rounded-lg border border-[var(--border-subtle)] font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setFrequency("instant")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                frequency === "instant"
                  ? "bg-[var(--purple-bright)] text-[#04060A] font-bold shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>Instant</span>
            </button>
            <button
              type="button"
              onClick={() => setFrequency("weekly")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                frequency === "weekly"
                  ? "bg-[#21262D] text-[var(--text-primary)] font-bold shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-[#C4463A]/10 border border-[#C4463A]/30 text-[#C4463A] text-xs font-mono flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {testResult && (
          <div
            className={`p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
              testResult.success
                ? "bg-[#0D9668]/10 border border-[#0D9668]/30 text-[#0D9668]"
                : "bg-[#C4463A]/10 border border-[#C4463A]/30 text-[#C4463A]"
            }`}
          >
            {testResult.success ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Submit Bar */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)]">
          {channel !== "email" ? (
            <button
              type="button"
              disabled={testing || !webhookUrl}
              onClick={handleSendTest}
              className="text-[11px] font-mono text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-40"
            >
              {testing ? "Testing..." : "Send Test Alert"}
            </button>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--purple-bright)] hover:brightness-110 disabled:opacity-50 text-[#04060A] font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
          >
            {saveSuccess ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                <span>{saving ? "Saving..." : "Activate Sniper"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
