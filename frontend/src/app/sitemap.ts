import { MetadataRoute } from "next";
import { Repo } from "@/types/opendoor";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://opendoor.abhishekco.de";
const LANGUAGES = ["go", "typescript", "python", "rust", "cpp", "java", "php", "ruby", "dart", "kotlin"];

export async function generateSitemaps() {
  // Returns sitemap IDs for language partitioning
  return LANGUAGES.map((lang) => ({ id: lang }));
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
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

  const targetLang = id ? id.toLowerCase() : "all";

  try {
    let page = 1;
    let totalPages = 1;

    // Loop through ALL pages in database for this language partition
    do {
      const url =
        targetLang === "all"
          ? `${API_BASE_URL}/api/v1/repos?page=${page}&per_page=100`
          : `${API_BASE_URL}/api/v1/repos?language=${targetLang}&page=${page}&per_page=100`;

      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) break;

      const data = await res.json();
      const repos: Repo[] = data.data || data.repos || [];
      totalPages = data.meta?.total_pages || Math.ceil((data.meta?.total || repos.length) / 100) || 1;

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

      page++;
    } while (page <= totalPages && page <= 50); // Paginate through all repos
  } catch (e) {
    console.error(`sitemap generation fetch error for language ${targetLang}:`, e);
  }

  return routes;
}
