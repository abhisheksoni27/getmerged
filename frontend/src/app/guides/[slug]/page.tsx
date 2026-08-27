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
      images: [
        {
          url: `https://getmerged.abhishekco.de/opengraph-image`,
          width: 1200,
          height: 630,
          alt: guide.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${guide.title} | GetMerged`,
      description: guide.description,
      images: [`https://getmerged.abhishekco.de/opengraph-image`],
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
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-[#0f172a] text-slate-100 font-sans">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(parsedJsonLd) }}
      />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-6">
          <Link href="/" title="GetMerged Home" className="hover:text-slate-100 font-bold">Home</Link>
          <span>/</span>
          <Link href="/guides" title="GetMerged Guides Directory" className="hover:text-slate-100 font-bold">Guides</Link>
          <span>/</span>
          <span className="text-slate-100 font-bold truncate">{guide.title}</span>
        </div>

        {/* Header Title Box */}
        <div className="border border-slate-700 bg-[#111827] p-6 sm:p-10 shadow-sm mb-8">
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate-400 mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-950/80 border-amber-800/80 border border-black font-bold text-amber-300">
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

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-space text-slate-100 mb-4 leading-tight">
            {guide.title}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            {guide.description}
          </p>

          <div className="overflow-hidden border border-slate-700 bg-[#1e293b] shadow-sm">
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
        <article className="border border-slate-700 bg-[#111827] p-6 sm:p-10 shadow-sm mb-10 text-slate-100">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            /* eslint-disable @typescript-eslint/no-unused-vars */
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-2xl sm:text-3xl font-extrabold font-space text-slate-50 mt-8 mb-4 leading-tight border-b border-slate-800 pb-3" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-xl sm:text-2xl font-bold font-space text-slate-50 mt-10 mb-4 leading-snug border-b-2 border-slate-800 pb-2 flex items-center gap-2" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-lg sm:text-xl font-bold font-space text-slate-100 mt-6 mb-3" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="text-sm sm:text-base leading-relaxed text-slate-200 my-4 font-sans" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-outside ml-6 my-4 space-y-2 text-sm sm:text-base text-slate-200" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-outside ml-6 my-4 space-y-2 text-sm sm:text-base text-slate-200" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="leading-relaxed" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <div className="border border-slate-700 bg-amber-950/70 border-amber-800/80 p-5 my-6 shadow-sm text-slate-100">
                  <blockquote className="space-y-2 text-sm sm:text-base italic" {...props} />
                </div>
              ),
              table: ({ node, ...props }) => (
                <div className="my-6 overflow-x-auto border border-slate-700 shadow-sm">
                  <table className="w-full text-left text-xs sm:text-sm font-sans divide-y-2 divide-slate-800 bg-[#111827]" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead className="bg-emerald-600 text-white font-space font-bold uppercase tracking-wider text-xs border-b border-slate-800" {...props} />
              ),
              tbody: ({ node, ...props }) => (
                <tbody className="divide-y divide-slate-800" {...props} />
              ),
              tr: ({ node, ...props }) => (
                <tr className="hover:bg-[#1e293b] transition-colors" {...props} />
              ),
              th: ({ node, ...props }) => (
                <th className="py-3 px-4 font-bold border-r border-black last:border-r-0" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="py-3 px-4 text-slate-200 border-r border-slate-800 last:border-r-0" {...props} />
              ),
              code: ({ node, className, children, ...props }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-slate-700 font-mono text-xs font-bold text-slate-100" {...props}>
                    {children}
                  </code>
                ) : (
                  <pre className="p-4 my-4 overflow-x-auto rounded-none border border-slate-700 bg-[#1e293b] text-emerald-400 font-mono text-xs shadow-sm">
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
                      className="font-bold text-slate-100 underline underline-offset-4 decoration-2 decoration-orange-500 hover:text-emerald-400 hover:decoration-slate-500 transition-all"
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
                    className="font-bold text-slate-100 underline underline-offset-4 decoration-2 decoration-orange-500 hover:text-emerald-400 hover:decoration-slate-500 transition-all"
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

        {/* CTA Footer Card */}
        <div className="border border-slate-700 bg-[#8ce99a] p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" /> Ready to find welcoming codebases?
            </div>
            <p className="text-sm font-sans text-slate-200">
              Browse live C-Rank™ scores across 53,000+ public GitHub repositories.
            </p>
          </div>
          <Link
            href="/repos"
            title="Explore Welcoming Repositories on GetMerged"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white font-bold text-xs border border-slate-700 shadow-sm hover:bg-zinc-800 transition-all shrink-0"
          >
            Explore Repositories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
