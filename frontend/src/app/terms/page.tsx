import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FileText, ArrowLeft } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - Opendoor",
  description:
    "Opendoor platform terms of service: acceptable use, C-Rank™ telemetry, user feedback rules, intellectual property, liability limits, and open source license.",
  alternates: {
    canonical: "https://opendoor.abhishekco.de/terms",
  },
  openGraph: {
    title: "Terms of Service - Opendoor",
    description:
      "Opendoor platform terms of service: acceptable use, C-Rank™ telemetry, user feedback rules, intellectual property, liability limits, and open source license.",
    url: "https://opendoor.abhishekco.de/terms",
    siteName: "Opendoor",
  },
};

export default function TermsPage() {
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
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl mb-3">
            <FileText className="h-3.5 w-3.5 text-blue-700" /> Platform Terms of Service
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-space text-zinc-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-zinc-500 font-sans">
            Last Updated: August 15, 2026
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 sm:p-10 border border-zinc-200/80 shadow-xs prose prose-sm leading-relaxed text-zinc-600 max-w-none space-y-8 font-sans">
          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Opendoor (&quot;the Platform&quot;), you agree to be bound by these Terms of
              Service (&quot;Terms&quot;) and acknowledge our{" "}
              <Link href="/privacy" title="View Opendoor Privacy Policy" className="text-zinc-900 underline font-semibold">
                Privacy Policy
              </Link>
              . If you do not agree to these Terms, you may not access or use the Platform. Opendoor is an
              open-source analytics platform that indexes public GitHub repositories to calculate objective C-Rank™
              metrics.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">2. Description of the Service</h2>
            <p>
              The Platform provides:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>C-Rank™ scores (S–D) for public GitHub repositories, computed from public telemetry such as merge rates, response times, and first-timer success.</li>
              <li>Search, filtering, and rankings across languages and ecosystems.</li>
              <li>Personal watchlists that track C-Rank™ changes over time.</li>
              <li>Community contributor feedback and AI-generated repository insights.</li>
            </ul>
            <p className="mt-3">
              We may modify, add, or discontinue features at any time. Where material changes affect these Terms, we
              will update them per Section 15.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">3. Eligibility & Accounts</h2>
            <p>You must be at least 16 years old to use the Platform. By using it, you represent that you meet this requirement.</p>
            <p className="mt-3">
              Some features (sign-in, watchlists, feedback, AI insights) require an account. Accounts are created by
              signing in with your GitHub or Google account. You are responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Keeping your credentials secure and not sharing your session.</li>
              <li>Maintaining accurate account information.</li>
              <li>All activity that occurs under your account.</li>
            </ul>
            <p className="mt-3">
              You may revoke access at any time by signing out or by revoking authorization within your GitHub or
              Google account settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">4. Acceptable Use</h2>
            <p>You agree not to use the Platform to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Violate any applicable law or regulation.</li>
              <li>Submit spam, harassment, hate speech, defamatory, or abusive feedback or reviews.</li>
              <li>Impersonate another person or entity, or misrepresent your GitHub contributor history.</li>
              <li>Scrape, crawl, or bulk-harvest repository data or user data at a scale that degrades the service.</li>
              <li>Attempt to gain unauthorized access to the Platform, its servers, databases, or other users&apos; accounts.</li>
              <li>Interfere with, disrupt, or overload the Platform or its infrastructure.</li>
              <li>Reverse engineer, decompile, or attempt to extract the source code of proprietary components.</li>
            </ul>
            <p className="mt-3">
              We may remove content and suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">5. C-Rank™ Telemetry & Scoring</h2>
            <p>
              All repository scores, response times, and merge rates are derived from public GitHub GraphQL and REST
              data. Scores are objective telemetry indicators and do not represent personal endorsements, guarantees of
              maintainer responsiveness, or promises about future behavior.
            </p>
            <p className="mt-3">
              We make reasonable efforts to keep scores current and accurate, but C-Rank™ scores are provided for
              informational purposes only and may be delayed, incomplete, or incorrect. You are responsible for
              evaluating repositories independently before contributing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">6. User Feedback & Reviews</h2>
            <p>When submitting contributor community feedback or reviews, you agree that:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>You will provide honest, constructive feedback based on your actual pull request experience.</li>
              <li>Spam, harassment, hate speech, or defamatory reviews will be removed immediately.</li>
              <li>GitHub contributor verification is performed automatically by inspecting public commit history.</li>
              <li>By submitting feedback, you grant Opendoor a non-exclusive, royalty-free, worldwide license to display, host, and use it to operate and improve the Platform. You retain ownership of your content.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">7. AI-Generated Insights</h2>
            <p>
              The Platform may display AI-generated summaries of repository community behavior, derived from public
              comment corpora. These insights are automated, may be inaccurate, incomplete, or contain errors, and are
              provided &quot;as is&quot; for informational purposes only. They do not constitute advice, endorsement,
              or a factual claim about any individual or repository.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">8. Intellectual Property</h2>
            <p>
              <strong>Our content:</strong> The Platform, including its design, the C-Rank™ name and methodology,
              trademarks, logos, and original content, is owned by or licensed to Opendoor. The open source code is
              licensed separately (see Section 12).
            </p>
            <p className="mt-3">
              <strong>GitHub data:</strong> Repository metadata and public comment text are the property of their
              respective owners and are made available under GitHub&apos;s terms and applicable licenses. We display and
              process this public data to provide the service.
            </p>
            <p className="mt-3">
              <strong>Your data:</strong> You retain all rights to content you submit. Nothing in these Terms transfers
              ownership of your data to us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">9. Third-Party Services</h2>
            <p>
              The Platform relies on and links to third-party services, including GitHub, Google, and AI processing
              providers. Your use of those services is governed by their own terms and privacy policies. We are not
              responsible for the availability, accuracy, or content of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">10. Disclaimer of Warranties</h2>
            <p>
              The Platform is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind,
              whether express or implied, including but not limited to implied warranties of merchantability, fitness
              for a particular purpose, non-infringement, and accuracy of scores or AI insights. We do not warrant that
              the Platform will be uninterrupted, error-free, or free of harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">11. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Opendoor, its maintainers, and contributors shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data,
              profits, or goodwill, arising out of or in connection with your use of the Platform. This includes any
              pull request rejections, maintainer review delays, or external repository decisions, over which we have no
              control.
            </p>
            <p className="mt-3">
              Our total aggregate liability for any claim arising out of these Terms shall not exceed the greater of
              the amounts you paid to us in the twelve (12) months preceding the claim or one hundred US dollars
              ($100). Some jurisdictions do not allow the exclusion or limitation of certain damages, so the above
              limitations may not apply to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">12. Open Source License</h2>
            <p>
              The Opendoor backend and frontend code bases are open source and licensed under the MIT License.
              Contributions are welcome on{" "}
              <a href="https://github.com/abhisheksoni27/opendoor" target="_blank" rel="noreferrer" title="Contribute to opendoor on GitHub" className="text-zinc-900 underline font-semibold">
                GitHub
              </a>
              . This section applies to the code only; it does not grant rights to the C-Rank™ trademark or branding.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">13. Suspension & Termination</h2>
            <p>
              We may suspend or terminate your access to the Platform, in whole or in part, at any time and without
              notice if we reasonably believe you have violated these Terms, engaged in abuse or unlawful activity, or
              if required by law. You may stop using the Platform at any time by signing out. Sections that by their
              nature should survive termination (including Sections 5–12 and 14–17) will survive.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">14. Indemnification</h2>
            <p>
              To the maximum extent permitted by law, you agree to indemnify and hold harmless Opendoor, its
              maintainers, contributors, and agents from and against any claims, damages, liabilities, and expenses
              (including reasonable legal fees) arising out of your use of the Platform, your violation of these Terms,
              or your violation of any rights of a third party.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">15. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be posted on this page with an
              updated &quot;Last Updated&quot; date, and where required, we will notify you. Continued use of the
              Platform after changes take effect constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">16. Governing Law & Disputes</h2>
            <p>
              These Terms are governed by the laws of the jurisdiction in which the maintainers are domiciled, without
              regard to conflict-of-law principles. Any dispute arising out of or relating to these Terms or the
              Platform will be resolved in the competent courts of that jurisdiction, subject to any mandatory
              provisions of your local law. Nothing in these Terms limits rights you cannot waive under applicable
              consumer protection law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">17. Severability & Entire Agreement</h2>
            <p>
              If any provision of these Terms is found to be unenforceable, that provision will be limited or removed
              to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
              These Terms, together with the Privacy Policy, constitute the entire agreement between you and Opendoor
              regarding your use of the Platform and supersede any prior agreements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-900 mb-3">18. Contact</h2>
            <p>
              Questions about these Terms? Please reach out via our official{" "}
              <a href="https://github.com/abhisheksoni27/opendoor" target="_blank" rel="noreferrer" title="View opendoor on GitHub" className="text-zinc-900 underline font-semibold">
                GitHub Repository
              </a>{" "}
              or review our{" "}
              <Link href="/privacy" title="View Opendoor Privacy Policy" className="text-zinc-900 underline font-semibold">
                Privacy Policy
              </Link>{" "}
              for details on how we handle your data.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
