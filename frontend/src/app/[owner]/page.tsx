import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RepoCard } from "@/components/RepoCard";
import { UserFeedbackList } from "@/components/UserFeedbackList";
import { UserProfile } from "@/types/opendoor";
import {
  Calendar,
  Bookmark,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
  User as UserIcon,
} from "lucide-react";

interface ProfilePageProps {
  params: Promise<{ owner: string }>;
}

const INTERNAL_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";

async function getUserProfile(slug: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/v1/users/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 }, // Cache on edge for 5 mins
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("SSR fetch failed for user slug:", slug, e);
    return null;
  }
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { owner } = await params;
  const profile = await getUserProfile(owner);

  if (!profile) {
    return {
      title: "User Profile Not Found - GetMerged",
    };
  }

  const title = `${profile.username} (@${profile.slug}) - Contributor Profile | GetMerged`;
  const description = `Explore ${profile.username}'s open source footprint on GetMerged. Tracking ${profile.stats.watchlist_count} repositories, ${profile.stats.feedback_count} reviews, and maintainer feedback scores.`;

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
    alternates: {
      canonical: `https://getmerged.abhishekco.de/${profile.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `https://getmerged.abhishekco.de/${profile.slug}`,
      siteName: "GetMerged",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { owner } = await params;
  const profile = await getUserProfile(owner);

  if (!profile) {
    notFound();
  }

  // Detect if current viewer is the profile owner
  let currentUserSlug: string | undefined;
  const cookieStore = await cookies();
  const token = cookieStore.get("opendoor_token")?.value;
  if (token) {
    try {
      const meRes = await fetch(`${INTERNAL_API_URL}/api/v1/auth/me`, {
        headers: { Cookie: `opendoor_token=${token}` },
        cache: "no-store",
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        currentUserSlug = meData.user?.slug;
      }
    } catch {
      // Unauthenticated
    }
  }

  const memberSinceFormatted = new Date(profile.member_since).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profile.username,
      alternateName: profile.slug,
      ...(profile.avatar_url ? { image: profile.avatar_url } : {}),
      ...(profile.github_url ? { sameAs: [profile.github_url] } : {}),
    },
  };

  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-[#faf9f6] overflow-x-hidden">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Link href="/" title="Back to GetMerged Home" className="hover:text-zinc-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-zinc-900 font-semibold">@{profile.slug}</span>
        </nav>

        {/* Hero Profile Card */}
        <section className="border border-zinc-200/90 bg-white p-6 sm:p-9 shadow-xs rounded-3xl mb-10 transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-6 flex-1">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl border border-zinc-200 bg-zinc-50 shrink-0 object-cover shadow-2xs"
                />
              ) : (
                <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl border border-zinc-200 bg-zinc-900 text-white flex items-center justify-center font-space font-extrabold text-2xl shrink-0 shadow-2xs">
                  <UserIcon className="h-8 w-8 text-zinc-300" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-3 py-0.5 font-mono text-xs font-semibold rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-200">
                    @{profile.slug}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-bold font-space text-zinc-900 break-all tracking-tight leading-tight">
                  {profile.username}
                </h1>

                <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs font-sans text-zinc-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Member since {memberSinceFormatted}</span>
                  </span>

                  {profile.github_url && (
                    <a
                      href={profile.github_url}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      title={`Visit ${profile.username}'s public GitHub profile`}
                      className="inline-flex items-center gap-1 font-semibold text-zinc-800 hover:text-zinc-950 underline transition-colors"
                    >
                      <span>GitHub Profile</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Stat Badges / Quick Chips */}
            <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2.5 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-zinc-100 font-sans">
              <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200/90 rounded-2xl px-4 py-2 text-xs">
                <Bookmark className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-zinc-500">Watched Repos:</span>
                <strong className="text-zinc-900 font-mono font-bold">{profile.stats.watchlist_count}</strong>
              </div>

              <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200/90 rounded-2xl px-4 py-2 text-xs">
                <MessageSquare className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="text-zinc-500">Reviews Left:</span>
                <strong className="text-zinc-900 font-mono font-bold">{profile.stats.feedback_count}</strong>
              </div>

              {profile.stats.verified_contributions !== null && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2 text-xs text-emerald-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Verified PR Reviews:</span>
                  <strong className="font-mono font-bold">{profile.stats.verified_contributions}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Achievement Card & Viral Share Buttons (Story 6.2 & 6.3) */}
          <div className="mt-8 pt-6 border-t border-zinc-100 font-sans">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-bold font-space text-zinc-900">Verified Contributor Achievement Card</h2>
                <p className="text-xs text-zinc-500">Dynamically generated live badge proof for social profiles.</p>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my verified open-source contributor profile on @GetMerged! Tracking PR merge metrics and maintainer responsiveness.`)}&url=${encodeURIComponent(`https://getmerged.abhishekco.de/${profile.slug}`)}`}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  title="Share your Contributor Card on X"
                  className="px-3 py-1.5 rounded-xl bg-black text-white font-bold hover:bg-zinc-800 transition-all flex items-center gap-1.5"
                >
                  Share on X
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://getmerged.abhishekco.de/${profile.slug}`)}`}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  title="Share your Contributor Card on LinkedIn"
                  className="px-3 py-1.5 rounded-xl bg-[#0A66C2] text-white font-bold hover:bg-[#084e96] transition-all flex items-center gap-1.5"
                >
                  Share on LinkedIn
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 overflow-hidden max-w-lg bg-zinc-900 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/v1/users/${profile.slug}/achievement.svg`}
                alt={`${profile.username}'s Contributor Achievement Card`}
                className="w-full h-auto rounded-xl"
              />
            </div>

            {/* GitHub Profile README Badge Markdown Embed (Story 9.2) */}
            <div className="mt-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 font-mono text-xs max-w-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-600 font-bold">GitHub Profile README Badge Markdown:</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-zinc-200 text-zinc-800 break-all select-all font-mono text-[11px]">
                {`[![GetMerged Contributor Proof](https://getmerged.abhishekco.de/api/v1/users/${profile.slug}/achievement.svg)](https://getmerged.abhishekco.de/${profile.slug})`}
              </div>
            </div>
          </div>
        </section>

        {/* Section: Watched Repositories */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold font-space text-zinc-900">Watched Repositories</h2>
              <p className="text-xs font-sans text-zinc-500 mt-0.5">
                Open-source projects {profile.username} actively monitors for maintainer responsiveness.
              </p>
            </div>
            <span className="font-mono text-xs text-zinc-400 bg-zinc-100 rounded-full px-3 py-1 font-semibold">
              {profile.watchlist.length}
            </span>
          </div>

          {profile.watchlist.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {profile.watchlist.map((repo) => (
                <RepoCard key={repo.id || repo.full_name} repo={repo} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/60 p-8 text-center font-sans">
              <Bookmark className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-800">No watched repositories yet</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                When {profile.username} watches repositories, they will appear here.
              </p>
            </div>
          )}
        </section>

        {/* Section: Contributor Reviews */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold font-space text-zinc-900">Community Reviews & Sentiment</h2>
              <p className="text-xs font-sans text-zinc-500 mt-0.5">
                Feedback and ratings submitted by {profile.username} on repository maintainer interactions.
              </p>
            </div>
            <span className="font-mono text-xs text-zinc-400 bg-zinc-100 rounded-full px-3 py-1 font-semibold">
              {profile.feedback.length}
            </span>
          </div>

          <UserFeedbackList
            initialFeedback={profile.feedback}
            profileSlug={profile.slug}
            currentUserSlug={currentUserSlug}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
