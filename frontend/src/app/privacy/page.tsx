import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Opendoor",
  description: "Opendoor privacy policy details on GitHub OAuth telemetry, data protection, and cookie usage.",
  alternates: {
    canonical: "https://opendoor.abhishekco.de/privacy",
  },
  openGraph: {
    title: "Privacy Policy - Opendoor",
    description: "Opendoor privacy policy details on GitHub OAuth telemetry, data protection, and cookie usage.",
    url: "https://opendoor.abhishekco.de/privacy",
    siteName: "Opendoor",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6] dev-grid-pattern">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full font-sans text-zinc-800">
        <Link
          href="/"
          title="Return to Opendoor Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-600 hover:text-zinc-900 transition-colors mb-6 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        <div className="rounded-3xl bg-white p-6 sm:p-10 border border-zinc-200/80 shadow-xs mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" /> Privacy & Security Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-space text-zinc-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-zinc-500 font-sans">
            Last Updated: July 27, 2026
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 sm:p-10 border border-zinc-200/80 shadow-xs prose prose-sm leading-relaxed text-zinc-600 max-w-none space-y-8 font-sans">
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
              Opendoor uses an essential session cookie for OAuth authentication. We also use anonymized product analytics (via PostHog) to improve platform responsiveness and feature discoverability.
            </p>
            <p className="mt-3">
              Analytics only run after you give consent via the cookie banner. You can accept or reject them at any time; rejecting does not affect sign-in or core functionality. See our{" "}
              <Link href="/terms" title="Read Opendoor Terms of Service" className="underline font-semibold">Terms of Service</Link> for details on acceptable use.
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
              <a href="https://github.com/abhisheksoni27/opendoor" target="_blank" rel="noreferrer" title="View opendoor on GitHub" className="text-zinc-900 underline font-semibold">
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
