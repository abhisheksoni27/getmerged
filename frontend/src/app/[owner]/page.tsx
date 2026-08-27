import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { UserProfile } from "@/types/opendoor";

interface ProfilePageProps {
  params: Promise<{ owner: string }>;
}

const INTERNAL_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";

async function getUserProfile(slug: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/v1/users/${encodeURIComponent(slug)}`, {
      cache: "no-store",
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
  const description = `Explore ${profile.username}'s verified open source resume on GetMerged.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://getmerged.abhishekco.de/u/${profile.slug}`,
    },
  };
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { owner } = await params;
  const profile = await getUserProfile(owner);

  if (!profile) {
    notFound();
  }

  // Canonical redirect to the rich 10-section verified contributor resume at /u/:username
  redirect(`/u/${profile.slug}`);
}
