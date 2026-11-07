import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/methodology",
        destination: "/how-c-rank-works",
        permanent: true,
      },
      {
        source: "/merge-rate",
        destination: "/how-c-rank-works",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";
    return [
      {
        // AC6: one-click email unsubscribe /u/{userId}?sig=... proxies to the
        // API when (and only when) a sig is present; bare /u/ pages stay
        // public profiles.
        source: "/u/:uid",
        has: [{ type: "query", key: "sig" }],
        destination: `${apiBase}/api/v1/gfi-alerts/unsubscribe-short?uid=:uid`,
      },
      {
        source: "/api/v1/auth/:path*",
        destination: `${apiBase}/api/v1/auth/:path*`,
      },
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/repo/:owner/:name.md",
        destination: "/:owner/:name/raw",
      },
      {
        source: "/:owner/:name.md",
        destination: "/:owner/:name/raw",
      },
      {
        source: "/repo/:owner/:name/raw",
        destination: "/:owner/:name/raw",
      },
      {
        source: "/how-c-rank-works.md",
        destination: "/llms-full.txt",
      },
      {
        source: "/about.md",
        destination: "/llms.txt",
      },
    ];
  },
  trailingSlash: false,
  headers: async () => [
    {
      // Match all HTML pages / document routes
      source: "/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, must-revalidate",
        },
        {
          key: "Cloudflare-CDN-Cache-Control",
          value: "max-age=43200, stale-while-revalidate=86400",
        },
        {
          key: "CDN-Cache-Control",
          value: "max-age=43200, stale-while-revalidate=86400",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Content-Security-Policy-Report-Only",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com https://us-assets.i.posthog.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com data:; img-src 'self' data: https://github.com https://avatars.githubusercontent.com https://*.githubusercontent.com https://raw.githubusercontent.com; connect-src 'self' https://getmerged.abhishekco.de https://us.i.posthog.com https://api.github.com; frame-ancestors 'none';",
        },
      ],
    },
    {
      // AC3: profile HTML + OG responses must not be CDN-cached while the
      // is_public flip has no tag-based purge path. Revisit with s-maxage +
      // revalidateTag("profile:<username>") once purge exists.
      source: "/u/:path*",
      headers: [
        { key: "Cache-Control", value: "private, no-store" },
        { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
        { key: "CDN-Cache-Control", value: "no-store" },
      ],
    },
    {
      // Match all immutable JS/CSS static build chunks
      source: "/_next/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      // Cache PostHog static bundles
      source: "/ingest/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=86400, stale-while-revalidate=604800",
        },
      ],
    },
    {
      source: "/api/og/u/:path*",
      headers: [
        { key: "Cache-Control", value: "private, no-store" },
        { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
        { key: "CDN-Cache-Control", value: "no-store" },
      ],
    },
    {
      source: "/icon.svg",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=86400, stale-while-revalidate=3600",
        },
      ],
    },
  ],
};

export default nextConfig;
