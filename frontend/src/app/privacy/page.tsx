"use client";

import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6]">
      <Header />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full font-sans text-zinc-800">
        <div className="border-b border-zinc-200/40 pb-6 mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl mb-3">
            <ShieldCheck className="h-3.5 w-3.5" /> Privacy & Security Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-space text-zinc-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2.5 text-xs sm:text-sm text-zinc-500 font-sans">
            Last Updated: July 27, 2026
          </p>
        </div>

        <div className="prose prose-sm leading-relaxed text-zinc-600 max-w-none space-y-8 font-sans">
          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">1. Information We Collect</h2>
            <p>
              Opendoor collects minimal public telemetry data required to calculate C-Rank™ scores for GitHub repositories. When you sign in with GitHub via OAuth:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>We receive your public GitHub profile ID, username, email address, and avatar URL.</li>
              <li>We do not request write access to your private GitHub repositories or OAuth scopes beyond standard user profile reading.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">2. How We Use Data</h2>
            <p>
              Your profile data is strictly used to authenticate your session, display your watchlist, and verify merged commit history when submitting contributor community vibe reviews.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">3. Cookies & Analytics</h2>
            <p>
              Opendoor uses essential session cookies for OAuth authentication and anonymized product analytics (via PostHog) to improve platform responsiveness and feature discoverability.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">4. Data Protection & Security</h2>
            <p>
              All user tokens and session keys are encrypted at rest using AES-256-GCM encryption. We do not sell, rent, or share personal user data with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">5. Contact Us</h2>
            <p>
              If you have questions regarding this Privacy Policy, please open an issue or contact maintainers on our official{" "}
              <a href="https://github.com/abhisheksoni27/opendoor" target="_blank" rel="noreferrer" className="text-zinc-900 underline font-semibold">
                GitHub Repository
              </a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
