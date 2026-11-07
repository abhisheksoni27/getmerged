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
          if (sub.frequency) setFrequency(sub.frequency);
        }
      })
      .catch(() => {});
  }, []);

  const toggleLang = (lang: string) => {
    if (selectedLangs.includes(lang)) {
      if (selectedLangs.length > 1) {
        setSelectedLangs(selectedLangs.filter((l) => l !== lang));
      }
    } else {
      setSelectedLangs([...selectedLangs, lang]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/alerts/subscribe-sniper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: channel === "email" ? email : "",
          webhook_url: channel !== "email" ? webhookUrl : "",
          channel,
          frequency,
          languages: selectedLangs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save alert preferences");
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save alert preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (channel === "email") {
      setTestResult({ success: true, message: "Email subscription preferences saved." });
      return;
    }

    if (!webhookUrl) {
      setErrorMsg("Please enter a Webhook URL first.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/alerts/test-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          webhook_url: webhookUrl,
          channel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Webhook delivery test failed");
      }
      setTestResult({ success: true, message: "✓ Live test alert dispatched to your webhook!" });
    } catch (err: unknown) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : "Delivery failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#0D9668]/10 border border-[#0D9668]/30 text-[#0D9668] text-xs font-mono font-semibold">
            <Radio className="h-3.5 w-3.5" />
            <span>Good First Issue Sniper · Webhook Radar</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-primary)]">
            Never Miss a Beginner Issue in Your Tech Stack
          </h3>
          <p className="text-sm text-[var(--text-secondary)] font-sans">
            Good first issues get claimed fast. The Sniper delivers instant webhook payloads to your Discord, Telegram bridge, or custom automation endpoint when maintainers label beginner tickets.
          </p>
        </div>

        <span className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-1 rounded-xl text-xs font-mono text-[var(--text-secondary)] shrink-0 self-start sm:self-auto flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-[#C4910A]" /> Webhook Powered
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-5 font-sans">
        {/* Step 1: Destination Channel */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            1. Select Alert Destination:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setChannel("discord")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                channel === "discord"
                  ? "bg-[var(--bg-elevated)] border-2 border-[var(--text-primary)] text-[var(--text-primary)] shadow-sm"
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <Bot className="h-5 w-5 text-[#2D8ABF] shrink-0" />
              <div>
                <div className="text-xs font-bold font-mono">Discord Webhook</div>
                <div className="text-xs text-[var(--text-tertiary)]">Channel push alert</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChannel("webhook")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                channel === "webhook"
                  ? "bg-[var(--bg-elevated)] border-2 border-[var(--text-primary)] text-[var(--text-primary)] shadow-sm"
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <Send className="h-5 w-5 text-[#0D9668] shrink-0" />
              <div>
                <div className="text-xs font-bold font-mono">Telegram / Custom Hook</div>
                <div className="text-xs text-[var(--text-tertiary)]">HTTPS Webhook link</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChannel("email")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                channel === "email"
                  ? "bg-[var(--bg-elevated)] border-2 border-[var(--text-primary)] text-[var(--text-primary)] shadow-sm"
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <Bell className="h-5 w-5 text-[var(--color-primary)] shrink-0" />
              <div>
                <div className="text-xs font-bold font-mono">Email Digest</div>
                <div className="text-xs text-[var(--text-tertiary)]">Inbox summary</div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Channel Input Details */}
        <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3">
          {channel === "discord" && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[var(--text-secondary)] font-semibold">Discord Channel Webhook URL:</label>
              <input
                type="url"
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:[var(--text-tertiary)] text-xs font-mono focus:border-[var(--border-strong)] focus:outline-none"
              />
            </div>
          )}

          {channel === "webhook" && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[var(--text-secondary)] font-semibold">Telegram Bridge or Custom Webhook URL (HTTPS):</label>
              <input
                type="url"
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-webhook-endpoint.com/receive or https://api.telegram.org/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:[var(--text-tertiary)] text-xs font-mono focus:border-[var(--border-strong)] focus:outline-none"
              />
            </div>
          )}

          {channel === "email" && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[var(--text-secondary)] font-semibold">Alert Email Address:</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:[var(--text-tertiary)] text-xs font-mono focus:border-[var(--border-strong)] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Step 3: Target Languages */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider">
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer border ${
                    active
                      ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)] shadow-sm"
                      : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  {active ? `✓ ${lang}` : lang}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Dispatch Frequency */}
        <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[var(--color-primary)]" />
              <span>Sniper Alert Frequency:</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Receive alerts the moment issues are indexed or batch into a weekly digest.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] font-mono text-xs shrink-0">
            <button
              type="button"
              onClick={() => setFrequency("weekly")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                frequency === "weekly" ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold shadow-xs" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Weekly Digest
            </button>
            <button
              type="button"
              onClick={() => setFrequency("instant")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                frequency === "instant"
                  ? "bg-[var(--color-primary)] text-white font-bold shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>Instant Webhook</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#C4463A]/10 border border-[#C4463A]/30 text-[#C4463A] text-xs font-mono flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {testResult && (
          <div className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
            testResult.success
              ? "bg-[#0D9668]/10 border border-[#0D9668]/30 text-[#0D9668]"
              : "bg-[#C4463A]/10 border border-[#C4463A]/30 text-[#C4463A]"
          }`}>
            {testResult.success ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Submit Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border-subtle)]">
          {channel !== "email" ? (
            <button
              type="button"
              disabled={testing || !webhookUrl}
              onClick={handleSendTest}
              className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span>{testing ? "Testing delivery..." : "Send Test Webhook Alert"}</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 disabled:opacity-50 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-[0.98]"
            >
              {saveSuccess ? (
                <>
                  <Check className="h-4 w-4 text-[var(--text-primary)]" />
                  <span>Preferences Saved!</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>{saving ? "Saving..." : "Activate Sniper Radar"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
