import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";
    return [
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
  skipTrailingSlashRedirect: true,
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
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
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
      headers: [{ key: "Cache-Control", value: "private, no-store" }],
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
      source: "/api/og/u/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store" }],
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
