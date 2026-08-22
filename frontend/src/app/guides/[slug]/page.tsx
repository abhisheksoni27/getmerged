import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllGuides, getGuideBySlug } from "@/lib/guides";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock, Calendar, ShieldCheck, ArrowRight, User } from "lucide-react";

export const revalidate = 3600;

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const guides = getAllGuides();
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: "Guide Not Found | GetMerged" };

  return {
    title: `${guide.title} | GetMerged Guides`,
    description: guide.description,
    alternates: {
      canonical: `https://getmerged.abhishekco.de/guides/${slug}`,
    },
    openGraph: {
      title: `${guide.title} | GetMerged`,
      description: guide.description,
      url: `https://getmerged.abhishekco.de/guides/${slug}`,
      siteName: "GetMerged",
      type: "article",
    },
  };
}

export default async function GuideDetailPage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  // Parse structured schema if embedded
  let parsedJsonLd = null;
  if (guide.jsonld) {
    try {
      parsedJsonLd = JSON.parse(guide.jsonld);
    } catch {
      parsedJsonLd = null;
    }
  }

  if (!parsedJsonLd) {
    parsedJsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      author: {
        "@type": "Organization",
        name: guide.author,
      },
      publisher: {
        "@type": "Organization",
        name: "GetMerged",
        url: "https://getmerged.abhishekco.de",
      },
      datePublished: guide.date,
      dateModified: guide.lastUpdated,
      mainEntityOfPage: `https://getmerged.abhishekco.de/guides/${slug}`,
    };
  }

  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-[#faf9f6] text-zinc-900 font-sans">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(parsedJsonLd) }}
      />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 mb-6">
          <Link href="/" title="GetMerged Home" className="hover:text-black font-bold">Home</Link>
          <span>/</span>
          <Link href="/guides" title="GetMerged Guides Directory" className="hover:text-black font-bold">Guides</Link>
          <span>/</span>
          <span className="text-zinc-900 font-bold truncate">{guide.title}</span>
        </div>

        {/* Header Title Box */}
        <div className="border-2 border-black bg-white p-6 sm:p-10 shadow-[6px_6px_0px_#000] mb-8">
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-zinc-600 mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 border border-black font-bold text-amber-900">
              {guide.section}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Updated: {guide.lastUpdated}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {guide.readingTime}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> {guide.author}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-space text-zinc-900 mb-4 leading-tight">
            {guide.title}
          </h1>
          <p className="text-zinc-700 text-sm sm:text-base leading-relaxed">
            {guide.description}
          </p>
        </div>

        {/* Content Body */}
        <article className="border-2 border-black bg-white p-6 sm:p-10 shadow-[6px_6px_0px_#000] prose prose-zinc max-w-none prose-headings:font-space prose-headings:font-bold prose-h2:text-2xl prose-h2:border-b-2 prose-h2:border-zinc-200 prose-h2:pb-2 prose-h3:text-lg prose-table:border-2 prose-table:border-black prose-th:bg-zinc-100 prose-th:p-3 prose-td:p-3 prose-td:border-t prose-td:border-zinc-200 prose-blockquote:border-l-4 prose-blockquote:border-black prose-blockquote:bg-zinc-50 prose-blockquote:p-4 prose-blockquote:my-6 prose-a:font-bold prose-a:text-emerald-700 prose-a:underline mb-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {guide.content}
          </ReactMarkdown>
        </article>

        {/* CTA Footer Card */}
        <div className="border-2 border-black bg-[#8ce99a] p-6 sm:p-8 shadow-[6px_6px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" /> Ready to find welcoming codebases?
            </div>
            <p className="text-sm font-sans text-zinc-800">
              Browse live C-Rank™ scores across 53,000+ public GitHub repositories.
            </p>
          </div>
          <Link
            href="/repos"
            title="Explore Welcoming Repositories on GetMerged"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white font-bold text-xs border-2 border-black shadow-[3px_3px_0px_#fff] hover:bg-zinc-800 transition-all shrink-0"
          >
            Explore Repositories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
