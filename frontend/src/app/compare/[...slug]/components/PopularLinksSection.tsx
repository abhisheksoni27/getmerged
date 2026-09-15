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
    <section aria-label="Explore other popular comparisons" className="pt-6 border-t border-white/[0.08]">
      <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold mb-4">
        Compare More High-Profile Repositories
      </h3>
      <div className="flex flex-wrap gap-2 text-xs font-mono">
        {POPULAR_LINKS.map((link) => (
          <Link prefetch={false}
            key={link.href}
            href={link.href}
            className="px-3 py-1.5 rounded-xl glass-card text-zinc-300 hover:text-white hover:border-white/[0.2] transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
