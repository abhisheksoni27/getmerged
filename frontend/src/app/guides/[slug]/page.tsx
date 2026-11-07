import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getGuideBySlug, getAllGuides } from "@/lib/guides";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Calendar, Clock, ArrowLeft, ArrowRight } from "lucide-react";

interface GuideDetailPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const guides = getAllGuides();
  return guides.map((guide) => ({
    slug: guide.slug,
  }));
}

export async function generateMetadata({ params }: GuideDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {
      title: "Guide Not Found - GetMerged",
    };
  }

  const rawTitle = guide.title.length > 46 ? guide.title.slice(0, 45) + "…" : guide.title;
  const title = `${rawTitle} | GetMerged`;
  const description = guide.description;
  const canonicalUrl = `https://getmerged.abhishekco.de/guides/${slug}`;
  const ogImageUrl = `https://getmerged.abhishekco.de/images/guides/${slug}.jpg`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "GetMerged",
      type: "article",
      publishedTime: guide.date,
      modifiedTime: guide.lastUpdated,
      authors: [guide.author],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: guide.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function GuideDetailPage({ params }: GuideDetailPageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  let parsedJsonLd = null;
  if (guide.jsonld) {
    try {
      parsedJsonLd = JSON.parse(guide.jsonld);
    } catch {
      // Fallback
    }
  }

  if (!parsedJsonLd) {
    parsedJsonLd = {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: guide.title,
      description: guide.description,
      image: `https://getmerged.abhishekco.de/images/guides/${slug}.jpg`,
      author: {
        "@type": "Person",
        name: guide.author,
        url: "https://getmerged.abhishekco.de/about",
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
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(parsedJsonLd) }}
      />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-tertiary)] mb-6">
          <Link prefetch={false} href="/" title="GetMerged Home" className="hover:text-[var(--text-primary)] font-medium">Home</Link>
          <span>/</span>
          <Link prefetch={false} href="/guides" title="GetMerged Guides Directory" className="hover:text-[var(--text-primary)] font-medium">Guides</Link>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-semibold truncate">{guide.title}</span>
        </div>

        {/* Header Title Box */}
        <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 rounded-2xl shadow-sm mb-8">
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-[var(--text-tertiary)] mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#C4910A]/10 border border-[#C4910A]/30 font-bold text-[#C4910A] rounded-lg">
              {guide.section}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Updated: {guide.lastUpdated}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {guide.readingTime}
            </span>
            <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <span className="h-5 w-5 rounded-full bg-[#0D9668]/15 border border-[#0D9668]/30 text-[#0D9668] flex items-center justify-center font-bold text-[10px]">
                AS
              </span>
              <span>{guide.author}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight font-display text-[var(--text-primary)] mb-4 leading-tight">
            {guide.title}
          </h1>
          <p className="text-[var(--text-secondary)] text-base sm:text-lg leading-relaxed mb-6 font-sans">
            {guide.description}
          </p>

          <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/images/guides/${guide.slug}.jpg`}
              alt={guide.title}
              width={1200}
              height={630}
              className="w-full h-auto object-cover max-h-[420px]"
            />
          </div>
        </div>

        {/* Content Body */}
        <article className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 rounded-2xl shadow-sm mb-10 text-[var(--text-primary)]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            /* eslint-disable @typescript-eslint/no-unused-vars */
            components={{
              h1: ({ node, ...props }) => (
                <h2 className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-primary)] mt-8 mb-4 leading-tight border-b border-[var(--border-subtle)] pb-3" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-primary)] mt-10 mb-4 leading-snug border-b border-[var(--border-subtle)] pb-2 flex items-center gap-2" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-lg sm:text-xl font-bold font-display text-[var(--text-primary)] mt-6 mb-3" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="text-base leading-relaxed text-[var(--text-secondary)] my-4 font-sans" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-outside ml-6 my-4 space-y-2 text-base text-[var(--text-secondary)]" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-outside ml-6 my-4 space-y-2 text-base text-[var(--text-secondary)]" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="leading-relaxed" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <div className="border-l-4 border-l-[var(--color-primary)] bg-[var(--bg-elevated)] p-5 my-6 rounded-r text-[var(--text-secondary)]">
                  <blockquote className="space-y-2 text-base italic font-serif" {...props} />
                </div>
              ),
              table: ({ node, ...props }) => (
                <div className="my-6 overflow-x-auto border border-[var(--border-subtle)] rounded-xl">
                  <table className="w-full text-left text-xs sm:text-sm font-sans divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-mono font-bold uppercase tracking-wider text-xs border-b border-[var(--border-subtle)]" {...props} />
              ),
              tbody: ({ node, ...props }) => (
                <tbody className="divide-y divide-[var(--border-subtle)]" {...props} />
              ),
              tr: ({ node, ...props }) => (
                <tr className="hover:bg-[var(--bg-elevated)]/60 transition-colors" {...props} />
              ),
              th: ({ node, ...props }) => (
                <th className="py-3 px-4 font-bold border-r border-[var(--border-subtle)] last:border-r-0" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="py-3 px-4 text-[var(--text-secondary)] border-r border-[var(--border-subtle)] last:border-r-0" {...props} />
              ),
              code: ({ node, className, children, ...props }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono text-xs font-semibold text-[var(--color-primary)]" {...props}>
                    {children}
                  </code>
                ) : (
                  <pre className="p-4 my-4 overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-mono text-xs shadow-xs">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                );
              },
              a: ({ node, href, children, ...props }) => {
                const isInternal = href && (href.startsWith("/") || href.startsWith("#"));
                if (isInternal) {
                  return (
                    <Link
                      href={href}
                      prefetch={false}
                      title={typeof children === "string" ? children : "Learn more on GetMerged"}
                      className="font-semibold text-[var(--color-primary)] underline underline-offset-4 hover:opacity-80 transition-all"
                      {...props}
                    >
                      {children}
                    </Link>
                  );
                }
                return (
                  <a
                    href={href || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={typeof children === "string" ? children : "Authoritative reference"}
                    className="font-semibold text-[var(--color-primary)] underline underline-offset-4 hover:opacity-80 transition-all"
                    {...props}
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {guide.content}
          </ReactMarkdown>
        </article>

        {/* Founder Byline & Personal Bio */}
        <div className="border border-white/[0.1] glass-panel p-6 sm:p-8 rounded-2xl shadow-sm mb-10 flex flex-col sm:flex-row items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
            AS
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-space font-bold text-white text-base">Abhishek Soni</span>
              <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded-md bg-white/[0.05]">Founder &middot; GetMerged</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
              Solo engineer building GetMerged in public. Writing guides to end pull-request ghost towns and help developers find welcoming open-source repositories.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs font-mono text-amber-400">
              <Link prefetch={false} href="/about" className="hover:underline">About the project &rarr;</Link>
              <span className="text-zinc-600">&bull;</span>
              <Link prefetch={false} href="/how-c-rank-works" className="hover:underline">Methodology &rarr;</Link>
            </div>
          </div>
        </div>

        {/* Read Next Section */}
        <div className="border border-white/[0.1] glass-panel p-6 sm:p-8 rounded-md border-t-2 border-t-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link prefetch={false}
            href="/guides"
            title="Browse all GetMerged engineering guides"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold text-zinc-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> All Playbooks & Guides
          </Link>

          <Link prefetch={false}
            href="/repos"
            title="Find welcoming repositories with real-time PR review metrics"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-orange-500 hover:bg-orange-600 font-mono text-xs font-bold text-white transition-colors"
          >
            Explore Scored Repositories <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
