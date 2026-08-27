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
          <p className="text-zinc-700 text-sm sm:text-base leading-relaxed mb-6">
            {guide.description}
          </p>

          <div className="overflow-hidden border-2 border-black bg-zinc-100 shadow-[4px_4px_0px_#000]">
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
        <article className="border-2 border-black bg-white p-6 sm:p-10 shadow-[6px_6px_0px_#000] mb-10 text-zinc-900">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            /* eslint-disable @typescript-eslint/no-unused-vars */
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-2xl sm:text-3xl font-extrabold font-space text-zinc-950 mt-8 mb-4 leading-tight border-b-2 border-black pb-3" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-xl sm:text-2xl font-bold font-space text-zinc-950 mt-10 mb-4 leading-snug border-b-2 border-zinc-200 pb-2 flex items-center gap-2" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-lg sm:text-xl font-bold font-space text-zinc-900 mt-6 mb-3" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="text-sm sm:text-base leading-relaxed text-zinc-800 my-4 font-sans" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-outside ml-6 my-4 space-y-2 text-sm sm:text-base text-zinc-800" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-outside ml-6 my-4 space-y-2 text-sm sm:text-base text-zinc-800" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="leading-relaxed" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <div className="border-2 border-black bg-amber-50 p-5 my-6 shadow-[3px_3px_0px_#000] text-zinc-900">
                  <blockquote className="space-y-2 text-sm sm:text-base italic" {...props} />
                </div>
              ),
              table: ({ node, ...props }) => (
                <div className="my-6 overflow-x-auto border-2 border-black shadow-[4px_4px_0px_#000]">
                  <table className="w-full text-left text-xs sm:text-sm font-sans divide-y-2 divide-black bg-white" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead className="bg-[#8ce99a] text-black font-space font-bold uppercase tracking-wider text-xs border-b-2 border-black" {...props} />
              ),
              tbody: ({ node, ...props }) => (
                <tbody className="divide-y divide-zinc-200" {...props} />
              ),
              tr: ({ node, ...props }) => (
                <tr className="hover:bg-zinc-50 transition-colors" {...props} />
              ),
              th: ({ node, ...props }) => (
                <th className="py-3 px-4 font-bold border-r border-black last:border-r-0" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="py-3 px-4 text-zinc-800 border-r border-zinc-200 last:border-r-0" {...props} />
              ),
              code: ({ node, className, children, ...props }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-300 font-mono text-xs font-bold text-zinc-900" {...props}>
                    {children}
                  </code>
                ) : (
                  <pre className="p-4 my-4 overflow-x-auto rounded-none border-2 border-black bg-zinc-900 text-emerald-400 font-mono text-xs shadow-[3px_3px_0px_#000]">
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
                      className="font-bold text-black underline underline-offset-4 decoration-2 decoration-emerald-500 hover:text-emerald-700 hover:decoration-black transition-all"
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
                    className="font-bold text-black underline underline-offset-4 decoration-2 decoration-emerald-500 hover:text-emerald-700 hover:decoration-black transition-all"
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
