import { MetadataRoute } from "next";
import { Repo } from "@/types/opendoor";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://opendoor.abhishekco.de";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://opendoor.abhishekco.de";
  const now = new Date();

  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?per_page=100`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const repos: Repo[] = data.data || data.repos || [];

      for (const r of repos) {
        if (!r.full_name) continue;
        const [owner, name] = r.full_name.split("/");
        if (owner && name) {
          routes.push({
            url: `${baseUrl}/repo/${owner}/${name}`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.8,
          });
        }
      }
    }
  } catch (e) {
    console.error("sitemap generation fetch error:", e);
  }

  return routes;
}
