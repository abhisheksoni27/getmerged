import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - GetMerged",
  description:
    "GetMerged privacy policy details GitHub and Google OAuth data collection, encryption, analytics consent, data retention, and your GDPR and CCPA rights.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/privacy",
  },
  openGraph: {
    title: "Privacy Policy - GetMerged",
    description:
      "GetMerged privacy policy details GitHub and Google OAuth data collection, encryption, analytics consent, data retention, and your GDPR and CCPA rights.",
    url: "https://getmerged.abhishekco.de/privacy",
    siteName: "GetMerged",
  },
};

export default function PrivacyPolicyPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://getmerged.abhishekco.de",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Privacy Policy",
        item: "https://getmerged.abhishekco.de/privacy",
      },
    ],
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-zinc-950 dev-grid-pattern">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full font-sans text-zinc-200">
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-xs text-zinc-400 hover:text-zinc-100 transition-colors mb-6 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        <div className="rounded-3xl bg-zinc-900/80 p-6 sm:p-10 border border-white/[0.08] shadow-xs mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-300 bg-emerald-950/70 border-emerald-800/80 border border-emerald-200 px-3 py-1 rounded-xl mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Privacy & Security Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-space text-zinc-100 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-zinc-400 font-sans">
            Last Updated: August 15, 2026
          </p>
        </div>

        <div className="rounded-3xl bg-zinc-900/80 p-6 sm:p-10 border border-white/[0.08] shadow-xs prose prose-sm leading-relaxed text-zinc-400 max-w-none space-y-8 font-sans">
          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">1. Introduction & Scope</h2>
            <p>
              GetMerged (&quot;we&quot;, &quot;our&quot;, or &quot;the Platform&quot;) helps open-source contributors
              discover GitHub repositories where pull requests are actually welcomed and merged. This Privacy Policy
              explains what personal data we collect, why we collect it, how long we keep it, who we share it with,
              and the choices and rights you have.
            </p>
            <p className="mt-3">
              This policy applies to all visitors of <a href="https://getmerged.abhishekco.de" className="underline font-semibold" title="GetMerged homepage">getmerged.abhishekco.de</a>,
              the web application, and any related features, including sign-in, watchlists, contributor feedback, and
              AI-generated repository insights. It does not apply to the practices of GitHub, Google, or any third-party
              service you access through links on the Platform.
            </p>
            <p className="mt-3">
              We are the &quot;controller&quot; of the personal data described in this policy. If you have questions,
              see Section 15 (Contact Us).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">2. Information We Collect</h2>
            <p>
              We practice data minimization: we collect only what is needed to provide the service. Personal data is
              divided into the categories below.
            </p>

            <h3 className="mt-4 text-sm font-bold font-space text-zinc-100 mb-2">a) Account Information (via OAuth)</h3>
            <p>
              When you sign in with <strong>GitHub</strong> or <strong>Google</strong>, we receive the following from
              the identity provider, scoped to the minimum needed:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>GitHub sign-in:</strong> your public GitHub profile ID, username, email address, and avatar URL. We request the <code>user:email</code> scope only - no access to your private repositories.</li>
              <li><strong>Google sign-in:</strong> your Google account ID, name, email address, and profile picture, via the <code>openid email profile</code> scopes.</li>
            </ul>
            <p className="mt-2">
              Your account record (ID, username, email, and avatar) is <strong>encrypted at rest</strong> using AES-256-GCM
              before it is stored.
            </p>

            <h3 className="mt-4 text-sm font-bold font-space text-zinc-100 mb-2">b) Content You Submit</h3>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Watchlist:</strong> the list of repositories you choose to track for C-Rank™ changes.</li>
              <li><strong>Contributor feedback:</strong> when you rate a repository&apos;s maintainer responsiveness, review speed, and beginner-friendliness (1–5 scales), add a free-text comment, and your status as a verified contributor.</li>
              <li><strong>Indexing requests:</strong> if you request that a repository be indexed, your user ID is recorded with the request.</li>
            </ul>

            <h3 className="mt-4 text-sm font-bold font-space text-zinc-100 mb-2">c) Data Collected Automatically</h3>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Analytics events:</strong> with your consent, we collect anonymized product usage events (page views, searches, filters, sign-in clicks) via PostHog. See Section 7 for details.</li>
              <li><strong>Session and preference data:</strong> a short-lived authentication cookie and, in some pages, a temporary scroll position stored in your browser&apos;s session storage.</li>
              <li><strong>Server logs and cache:</strong> standard technical metadata (IP address, request path, timestamps) necessary for security, rate limiting, and debugging. This data is kept in our infrastructure and cache layers.</li>
            </ul>

            <h3 className="mt-4 text-sm font-bold font-space text-zinc-100 mb-2">d) Public GitHub Data</h3>
            <p>
              We collect <strong>public</strong> GitHub data - repository metadata, pull request and issue comment text,
              merge rates, and response times - to compute C-Rank™ scores. This data is publicly available on GitHub and
              is processed for scoring and AI-generated insights. Public comment text may include the usernames of
              comment authors.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>To authenticate your sessions and keep you signed in across visits.</li>
              <li>To display and sync your watchlist, including notifications of C-Rank™ changes.</li>
              <li>To verify contributor status and publish community feedback alongside repository profiles.</li>
              <li>To generate AI-powered repository insights from public comment corpora.</li>
              <li>To measure and improve the Platform&apos;s usability and feature discoverability (analytics, with consent).</li>
              <li>To secure the Platform, prevent abuse, respond to support requests, and comply with legal obligations.</li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> sell, rent, or trade your personal information to any third party, including as
              &quot;sale&quot; or &quot;sharing&quot; is defined under the California Consumer Privacy Act (CCPA).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">4. Legal Bases for Processing (GDPR)</h2>
            <p>
              If you are located in the European Economic Area (EEA), the United Kingdom, or Switzerland, we process
              personal data on the following legal bases under the GDPR:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Contract performance (Article 6(1)(b)):</strong> providing account sign-in, watchlists, and feedback features you request.</li>
              <li><strong>Consent (Article 6(1)(a)):</strong> analytics cookies and events. You can withdraw consent at any time via the cookie banner or browser settings; withdrawal does not affect the lawfulness of processing before withdrawal.</li>
              <li><strong>Legitimate interests (Article 6(1)(f)):</strong> platform security, abuse prevention, debugging, and product improvement, balanced against your rights and interests.</li>
              <li><strong>Legal obligation (Article 6(1)(c)):</strong> where we must retain records to comply with applicable law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">5. Sharing & Third-Party Processors</h2>
            <p>
              We share personal data only with service providers that process it on our behalf under contractual
              obligations to keep it confidential and secure. The sub-processors we currently use:
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="py-2 pr-3 font-bold text-zinc-100">Provider</th>
                    <th className="py-2 pr-3 font-bold text-zinc-100">Purpose</th>
                    <th className="py-2 font-bold text-zinc-100">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr>
                    <td className="py-2 pr-3">GitHub</td>
                    <td className="py-2 pr-3">OAuth authentication; public repo/PR/comment telemetry for C-Rank™ scoring</td>
                    <td className="py-2">Profile fields, username; public data</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3">Google</td>
                    <td className="py-2 pr-3">OAuth authentication</td>
                    <td className="py-2">Profile fields</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3">PostHog (US cloud)</td>
                    <td className="py-2 pr-3">Anonymized product analytics</td>
                    <td className="py-2">Event data; GitHub ID + username for identity</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3">OpenCode AI API</td>
                    <td className="py-2 pr-3">Generates AI repository insights</td>
                    <td className="py-2">Public PR/issue comment text and author logins</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3">Cloud / database / cache providers</td>
                    <td className="py-2 pr-3">Hosting, MySQL/SQLite storage, Valkey caching, local NLP sidecar</td>
                    <td className="py-2">Encrypted user records and public telemetry</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              We may also disclose personal data when required by law, legal process, or government request, or when
              necessary to protect the rights, property, or safety of GetMerged, its users, or the public.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">6. International Data Transfers</h2>
            <p>
              Your personal data is stored on servers operated by our infrastructure providers, and some sub-processors
              (such as PostHog and the OpenCode AI API) operate outside the EEA/UK, including in the United States.
              Where personal data is transferred outside the EEA, the UK, or Switzerland, we rely on appropriate
              safeguards, including <strong>Standard Contractual Clauses (SCCs)</strong> adopted by the European
              Commission and applicable decisions for the UK, to ensure your data receives an adequate level of
              protection.
            </p>
            <p className="mt-3">
              You may request a copy of the relevant safeguards by contacting us (see Section 15).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">7. Cookies, Consent & Analytics</h2>
            <h3 className="mt-4 text-sm font-bold font-space text-zinc-100 mb-2">Essential cookies</h3>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong><code>opendoor_token</code></strong> - a session cookie that keeps you signed in (7-day lifetime). This is strictly necessary for authentication.</li>
              <li><strong><code>opendoor_consent</code></strong> - records your analytics choice (accepted: 1 year; rejected: 90 days) so we can honor it across visits.</li>
              <li><strong>Session storage</strong> - a temporary scroll-position value used only during a session.</li>
            </ul>

            <h3 className="mt-4 text-sm font-bold font-space text-zinc-100 mb-2">Analytics & consent</h3>
            <p>
              We use PostHog for anonymized product analytics. PostHog is initialized in memory-only mode and
              <strong> begins capturing events only after you accept</strong> via the cookie banner. You can:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Accept</strong> - analytics run to help us improve the Platform.</li>
              <li><strong>Reject</strong> - no analytics events are captured; core functionality, including sign-in and watchlists, is unaffected.</li>
              <li>Change your choice at any time by clearing the <code>opendoor_consent</code> cookie (the banner will reappear) or blocking the <code>/ingest</code> endpoint.</li>
            </ul>
            <p className="mt-2">
              We do not use advertising cookies, retargeting, or third-party ad trackers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">8. Data Retention</h2>
            <p>We retain personal data only as long as necessary for the purposes described in this policy:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Account data:</strong> retained while your account is active and for a reasonable period afterward to allow you to sign back in without losing your watchlist.</li>
              <li><strong>Watchlist:</strong> retained until you remove a repository or delete your account; cascade-deleted when an account is removed.</li>
              <li><strong>Analytics events:</strong> retained per PostHog&apos;s data retention policy for the project.</li>
              <li><strong>Repository telemetry snapshots:</strong> daily score snapshots are pruned after approximately 90 days to keep scores current.</li>
              <li><strong>Logs and cache:</strong> retained for security and debugging purposes for a limited period.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">9. Data Security</h2>
            <p>
              We implement reasonable technical and organizational safeguards, including:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Encryption at rest:</strong> user identity fields (ID, username, email, avatar) are encrypted with AES-256-GCM before storage.</li>
              <li><strong>Encryption in transit:</strong> all traffic is served over HTTPS/TLS.</li>
              <li><strong>Authentication:</strong> sessions use signed, expiring JSON Web Tokens (JWTs) validated by our middleware.</li>
              <li><strong>Access control:</strong> internal endpoints and admin alerting are separated from public routes; sensitive operations require authentication.</li>
            </ul>
            <p className="mt-3">
              No method of transmission or storage is 100% secure. While we work to protect your data, we cannot
              guarantee absolute security, and we will notify affected users and relevant authorities where required by
              law in the event of a personal data breach.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">10. Your Rights & Choices</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Right of access:</strong> request a copy of the personal data we hold about you.</li>
              <li><strong>Right to rectification:</strong> correct inaccurate or incomplete data.</li>
              <li><strong>Right to erasure (&quot;right to be forgotten&quot;):</strong> request deletion of your personal data where it is no longer necessary or consent is withdrawn.</li>
              <li><strong>Right to restrict processing:</strong> limit how we process your data in certain circumstances.</li>
              <li><strong>Right to data portability:</strong> receive your data in a structured, machine-readable format.</li>
              <li><strong>Right to object:</strong> object to processing based on legitimate interests.</li>
              <li><strong>Right to withdraw consent:</strong> withdraw analytics consent at any time.</li>
            </ul>
            <p className="mt-3">
              <strong>California (CCPA/CPRA):</strong> California residents have the right to know the categories and
              specific pieces of personal information we collect, the right to delete it, the right to correct it, and
              the right to opt out of the sale or sharing of personal information. We do not sell or share personal
              information as defined by the CCPA, and we do not use targeted advertising. California residents may
              exercise their rights by contacting us below.
            </p>
            <p className="mt-3">
              To exercise any of these rights, contact us using the details in Section 15. We will verify your identity
              and respond within the timeframes required by applicable law (generally one month under the GDPR, and 45
              days under the CCPA).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">11. Children&apos;s Privacy</h2>
            <p>
              The Platform is not directed to children under the age of 16, and we do not knowingly collect personal
              data from children. If you believe a child has provided us personal data, please contact us and we will
              delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">12. Third-Party Links</h2>
            <p>
              The Platform contains links to external sites (including GitHub). We are not responsible for the privacy
              practices or content of those sites. We encourage you to review the privacy policies of any external
              service you visit.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">13. Business Transfers</h2>
            <p>
              If GetMerged is involved in a merger, acquisition, reorganization, or sale of assets, your personal data
              may be transferred as part of that transaction. We will notify you and take steps to ensure it continues
              to be handled in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">14. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, features, or
              legal requirements. Material changes will be posted on this page with an updated &quot;Last Updated&quot;
              date. Where required, we will notify you of material changes. Continued use of the Platform after changes
              take effect constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold font-space text-zinc-100 mb-3">15. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests about this Privacy Policy or your personal data, please reach
              out to our maintainers:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Open an issue or DM the maintainers on our official{" "}
                <a href="https://github.com/GetMergedApp" target="_blank" rel="noreferrer" title="View GetMergedApp on GitHub" className="text-zinc-100 underline font-semibold">
                  GitHub Organization
                </a>
                .
              </li>
              <li>Email us directly at{" "}
                <a href="mailto:hi@abhishekco.de" title="Email GetMerged support" className="text-zinc-100 underline font-semibold">
                  hi@abhishekco.de
                </a>
                .
              </li>
              <li>Review the terms in our{" "}
                <Link href="/terms" title="View GetMerged Terms of Service" className="text-zinc-100 underline font-semibold">
                  Terms of Service
                </Link>.
              </li>
            </ul>
            <p className="mt-3">
              If you are an EU/UK resident and believe your data protection complaint has not been addressed, you may
              lodge a complaint with your local supervisory authority.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
