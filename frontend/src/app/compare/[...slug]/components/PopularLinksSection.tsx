import React from "react";
import Link from "next/link";

const POPULAR_LINKS = [
  { href: "/compare/facebook/react/vs/vuejs/vue", label: "React vs Vue" },
  { href: "/compare/remix-run/remix/vs/vercel/next.js", label: "Next.js vs Remix" },
  { href: "/compare/golang/go/vs/rust-lang/rust", label: "Go vs Rust" },
  { href: "/compare/expressjs/express/vs/fastify/fastify", label: "Fastify vs Express" },
  { href: "/compare/nodejs/node/vs/oven-sh/bun", label: "Bun vs Node.js" },
  { href: "/compare/bootstrap/vs/tailwindlabs/tailwindcss", label: "Tailwind vs Bootstrap" },
];

export function PopularLinksSection() {
  return (
    <section aria-label="Explore other popular comparisons" className="pt-6 border-t border-[var(--border-subtle)]">
      <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold mb-4">
        Compare More High-Profile Repositories
      </h3>
      <div className="flex flex-wrap gap-2 text-xs font-mono">
        {POPULAR_LINKS.map((link) => (
          <Link prefetch={false}
            key={link.href}
            href={link.href}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-terracotta)] shadow-xs transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
