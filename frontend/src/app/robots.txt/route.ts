export const dynamic = "force-static";

export function GET() {
  const robotsTxt = `User-agent: *
Content-Signal: search=yes, ai-train=no, ai-input=yes
Allow: /
Allow: /api/v1/repos
Allow: /api/v1/optimal-time
Allow: /api/badge/
Disallow: /api/

User-agent: GPTBot
Content-Signal: search=yes, ai-train=no, ai-input=yes
Allow: /
Allow: /api/v1/repos
Allow: /api/v1/optimal-time
Allow: /api/badge/
Disallow: /api/

User-agent: ClaudeBot
Content-Signal: search=yes, ai-train=no, ai-input=yes
Allow: /
Allow: /api/v1/repos
Allow: /api/v1/optimal-time
Allow: /api/badge/
Disallow: /api/

User-agent: PerplexityBot
Content-Signal: search=yes, ai-train=no, ai-input=yes
Allow: /
Allow: /api/v1/repos
Allow: /api/v1/optimal-time
Allow: /api/badge/
Disallow: /api/

User-agent: Anthropic-ai
Content-Signal: search=yes, ai-train=no, ai-input=yes
Allow: /
Allow: /api/v1/repos
Allow: /api/v1/optimal-time
Allow: /api/badge/
Disallow: /api/

Sitemap: https://getmerged.abhishekco.de/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
