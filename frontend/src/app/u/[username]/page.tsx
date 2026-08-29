import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  getPublicProfile,
  isReservedUsername,
  isValidUsername,
  type PublicProfile,
} from "@/lib/public-profile";
import { ProfileClientView } from "./ProfileClientView";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    return { title: "Profile Not Found - GetMerged" };
  }

  const title = `${profile.username} (@${profile.slug}) - Verified Open Source Developer Profile | GetMerged`;
  const description = `${profile.username}'s verified open-source developer profile: ${profile.headline || "Featured showcase projects, auto-imported public repos, and C-Rank pull request benchmarks."}`;
  const ogUrl = `/api/og/u/${encodeURIComponent(profile.slug)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${profile.username} developer profile` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  if (!username || !isValidUsername(username) || isReservedUsername(username)) notFound();

  const profile: PublicProfile | null = await getPublicProfile(username);
  if (!profile) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-white font-sans dev-grid-pattern">
      <Header />
      <ProfileClientView initialProfile={profile} />
      <Footer />
    </div>
  );
}
