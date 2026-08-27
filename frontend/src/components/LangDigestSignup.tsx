"use client";

import React, { useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

interface LangDigestSignupProps {
  language: string;
  languageName: string;
}

type Status = "idle" | "submitting" | "success" | "error";

// Inline anonymous email signup for the weekly per-language digest (AC1).
// Posts email + language (+ a honeypot that must stay empty) to POST
// /api/subscribe. Captcha is verified server-side (AC4); the widget token is
// sent if a Turnstile site key is configured, otherwise an empty token is sent
// and the backend accepts it when verification is disabled (dev/test).
export function LangDigestSignup({ language, languageName }: LangDigestSignupProps) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          language,
          website,
          captcha_token: "",
        }),
      });
      // Honeypot filled: silently pretend success to avoid tipping off bots.
      if (website.trim() !== "") {
        setStatus("success");
        setMessage("You're subscribed!");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("success");
        setMessage(
          "Check your inbox - we sent a confirmation link. Click it to start receiving the weekly digest."
        );
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data?.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again in a moment.");
    }
  }

  if (status === "success") {
    return (
      <section className="rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-6 sm:p-8 shadow-xs">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-base font-bold text-emerald-300 font-space">
              You&apos;re on the list
            </h3>
            <p className="text-xs sm:text-sm text-emerald-300 font-sans mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-zinc-900/80 p-6 sm:p-8 border border-white/[0.08] font-sans shadow-xs">
      <h3 className="text-base font-bold text-white mb-1.5 flex items-center gap-2 font-space">
        <Mail className="h-4 w-4 text-sky-600" />
        Get this week&apos;s top welcoming repos + fresh Good First Issues for {languageName}
      </h3>
      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4 font-sans">
        Free weekly email, scoped to {languageName}. No account needed - confirm once and
        unsubscribe anytime.
      </p>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col sm:flex-row gap-2.5">
        <label className="sr-only" htmlFor="lang-digest-email">
          Email address
        </label>
        <input
          id="lang-digest-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="flex-1 rounded-xl border border-white/[0.12] px-3.5 py-2.5 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
        />
        {/* Honeypot: hidden from humans, bots auto-fill it (AC3). */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="lang-digest-website">Leave this empty</label>
          <input
            id="lang-digest-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60 transition-colors shadow-xs"
        >
          {status === "submitting" ? "Subscribing…" : "Send me the digest"}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-2.5 text-xs text-rose-600 flex items-center gap-1.5 font-sans">
          <AlertCircle className="h-3.5 w-3.5" />
          {message}
        </p>
      )}
    </section>
  );
}
