import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FileText } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Opendoor",
  description: "Opendoor platform terms of service, C-Rank™ telemetry usage, and license agreement.",
  alternates: {
    canonical: "https://opendoor.abhishekco.de/terms",
  },
  openGraph: {
    title: "Terms of Service - Opendoor",
    description: "Opendoor platform terms of service, C-Rank™ telemetry usage, and license agreement.",
    url: "https://opendoor.abhishekco.de/terms",
    siteName: "Opendoor",
  },
};

export default function TermsPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6]">
      <Header />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full font-sans text-zinc-800">
        <div className="border-b border-zinc-200/40 pb-6 mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold text-blue-700 bg-blue-50 px-3.5 py-1.5 rounded-xl mb-3">
            <FileText className="h-3.5 w-3.5" /> Platform Terms of Service
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-space text-zinc-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-2.5 text-xs sm:text-sm text-zinc-500 font-sans">
            Last Updated: July 27, 2026
          </p>
        </div>

        <div className="prose prose-sm leading-relaxed text-zinc-600 max-w-none space-y-8 font-sans">
          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Opendoor (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. Opendoor is an open-source analytics platform that indexes public GitHub repositories to calculate objective C-Rank™ metrics.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">2. C-Rank™ Telemetry & Scoring</h2>
            <p>
              All repository scores, response times, and merge rates are derived from public GitHub GraphQL data. Scores are objective telemetry indicators and do not represent personal endorsements or guarantees of maintainer responsiveness.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">3. User Feedback & Reviews</h2>
            <p>
              When submitting contributor community vibe reviews:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2 font-sans">
              <li>You agree to provide honest, constructive feedback based on your actual pull request experience.</li>
              <li>Spam, harassment, hate speech, or defamatory reviews will be removed immediately.</li>
              <li>GitHub contributor verification is performed automatically by inspecting public commit history.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">4. Limitation of Liability</h2>
            <p>
              Opendoor is provided &quot;as is&quot; without warranties of any kind. Maintainers and contributors of Opendoor are not liable for any pull request rejections, maintainer review delays, or external repository decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">5. Open Source License</h2>
            <p>
              Opendoor backend and frontend code bases are open source and licensed under the MIT License. Contributions are welcome on{" "}
              <a href="https://github.com/abhisheksoni27/opendoor" target="_blank" rel="noreferrer" title="Contribute to opendoor on GitHub" className="text-zinc-900 underline font-semibold">
                GitHub
              </a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
