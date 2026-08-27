import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { API_BASE_URL } from "@/lib/api";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ShareCardData {
  id: string;
  repo_full_name: string;
  pr_title?: string;
  summary?: string;
  overall_score: number;
  ready_to_merge: boolean;
  ref_token: string;
  created_at: string;
  expires_at: string;
}

async function getShareCard(id: string): Promise<ShareCardData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/cards/${encodeURIComponent(id)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Failed to load share card:", id, e);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await getShareCard(id);

  if (!card) {
    return {
      title: "Achievement Card Not Found - GetMerged",
      robots: { index: false, follow: false },
    };
  }

  const title = `${card.repo_full_name} Verified Completion Card | GetMerged`;
  const description = card.summary || `Verified open-source completion on GetMerged. Scored ${card.overall_score}/100.`;
  const ogUrl = `${API_BASE_URL}/api/v1/cards/${encodeURIComponent(id)}/og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function ShareCardPage({ params }: PageProps) {
  const { id } = await params;
  const card = await getShareCard(id);

  if (!card) {
    notFound();
  }

  const ogUrl = `${API_BASE_URL}/api/v1/cards/${encodeURIComponent(id)}/og.png`;

  return (
    <div className="min-h-screen flex flex-col bg-black dev-grid-pattern">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border-emerald-800/80 border border-emerald-300 text-emerald-300 text-xs font-semibold font-mono mb-4 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            Verified Hacktoberfest Completion Card
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-space text-white tracking-tight">
            {card.repo_full_name}
          </h1>
          <p className="mt-2 text-sm text-zinc-300 font-sans max-w-xl mx-auto">
            {card.summary || "All 4 Hacktoberfest pull requests merged and verified on GitHub."}
          </p>
        </div>

        <div className="rounded-3xl glass-panel p-4 sm:p-8 border border-white/[0.1] shadow-md mb-8">
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.1] shadow-sm bg-black aspect-[1200/630]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogUrl}
              alt={`${card.repo_full_name} Completion Card`}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/[0.1]">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Verified On-Chain / GitHub Search API</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/hacktoberfest"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl glass-card text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
              >
                Track Your Merges <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
