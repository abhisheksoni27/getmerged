import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Anthropic-ai"],
        allow: "/",
      },
    ],
    sitemap: "https://getmerged.abhishekco.de/sitemap.xml",
  };
}
