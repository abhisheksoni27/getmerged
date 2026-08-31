import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getPublicProfile } from "@/lib/public-profile";
import { ResumePrintClient } from "./ResumePrintClient";
import type { ContributorKarmaData } from "@/components/KarmaProfileBadge";

import { API_BASE_URL } from "@/lib/api";

interface ResumePageProps {
  params: Promise<{ username: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ResumePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    return { title: "Resume Not Found - GetMerged" };
  }

  return {
    title: `${profile.username} - Verified Proof of Work Resume | GetMerged`,
    description: `Verified open-source proof-of-work resume for ${profile.username} with audited pull request merges and maintainer review scores.`,
  };
}

async function getKarma(username: string): Promise<ContributorKarmaData | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/u/${encodeURIComponent(username)}/karma`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ResumePage({ params }: ResumePageProps) {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  const karma = await getKarma(profile.slug || profile.username);

  return <ResumePrintClient profile={profile} karma={karma} />;
}
