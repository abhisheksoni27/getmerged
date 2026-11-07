"use client";

import React, { useState } from "react";
import { X, Crosshair, Bell, CheckCircle2, AlertCircle, Sparkles, Send } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface IssueSniperModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLanguage?: string;
  defaultRepo?: string;
}

export function IssueSniperModal({
  isOpen,
  onClose,
  defaultLanguage = "",
  defaultRepo = "",
}: IssueSniperModalProps) {
  const [email, setEmail] = useState("");
  const [languages, setLanguages] = useState<string[]>(
    defaultLanguage ? [defaultLanguage] : ["TypeScript", "Go"]
  );
  const [targetRepo, setTargetRepo] = useState(defaultRepo);
  const [frequency, setFrequency] = useState<"instant" | "weekly">("instant");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const popularLanguages = ["TypeScript", "Go", "Python", "Rust", "C++", "Java", "Ruby"];

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !webhookUrl) {
      setError("Please provide an email or Discord/Slack webhook URL.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/alerts/subscribe-sniper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          languages,
          repo_full_name: targetRepo.trim(),
          frequency,
          webhook_url: webhookUrl.trim(),
          channel: webhookUrl.trim() ? "webhook" : "email",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to activate Issue Sniper");
      }

      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Subscription failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-[var(--text-primary)] font-sans">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-zinc-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Crosshair className="h-3.5 w-3.5 text-emerald-400" />
            <span>Instant Good First Issue Alerts</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-space text-[var(--text-primary)]">
            Get Notified When Good First Issues Open.
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Good beginner issues in active open-source projects get claimed fast. Get
            an email or Discord notification the moment maintainers open a new starter task.
          </p>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-[var(--text-primary)]">Alerts Activated!</h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                You&apos;re all set. We will notify you whenever new Good First Issues matching
                your languages are opened on GitHub.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-[var(--text-secondary)] font-semibold">
                Your Email Address:
              </label>
              <input
                type="email"
                required
                placeholder="dev@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Target Languages */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-[var(--text-secondary)] font-semibold">
                Target Languages:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {popularLanguages.map((lang) => (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      languages.includes(lang)
                        ? "bg-emerald-600 text-white font-bold"
                        : "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Repo (Optional) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-[var(--text-secondary)]">
                Specific Target Repo (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. supabase/supabase (leave empty for all S-Tier repos)"
                value={targetRepo}
                onChange={(e) => setTargetRepo(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Webhook Dispatch (Optional) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-[var(--text-secondary)]">
                Discord / Slack / Telegram Webhook URL (Optional):
              </label>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Alert Frequency Toggle */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFrequency("instant")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  frequency === "instant"
                    ? "bg-emerald-950/30 border-emerald-500 text-white"
                    : "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                <div className="text-xs font-bold font-mono flex items-center gap-1.5 text-emerald-400 mb-1">
                  <Sparkles className="h-3.5 w-3.5" /> Instant Alert
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">Pings within 5 minutes of issue drop</div>
              </button>

              <button
                type="button"
                onClick={() => setFrequency("weekly")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  frequency === "weekly"
                    ? "bg-emerald-950/30 border-emerald-500 text-white"
                    : "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                <div className="text-xs font-bold font-mono flex items-center gap-1.5 text-[var(--text-secondary)] mb-1">
                  <Bell className="h-3.5 w-3.5" /> Weekly Digest
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">Delivered Monday mornings at 8 AM</div>
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-2 text-red-300 font-mono text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? "Activating Sniper..." : "Arm Issue Sniper"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
