import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface GuideMeta {
  title: string;
  description: string;
  slug: string;
  date: string;
  lastUpdated: string;
  author: string;
  section: string;
  keywords: string[];
  jsonld?: string;
  readingTime?: string;
}

export interface GuidePost extends GuideMeta {
  content: string;
}

const GUIDES_DIR = path.join(process.cwd(), "src/content/guides");

export function getAllGuides(): GuideMeta[] {
  if (!fs.existsSync(GUIDES_DIR)) {
    return [];
  }

  const fileNames = fs.readdirSync(GUIDES_DIR);
  const guides: GuideMeta[] = [];

  for (const fileName of fileNames) {
    if (!fileName.endsWith(".md")) continue;
    const fullPath = path.join(GUIDES_DIR, fileName);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);

    const formatDate = (val: unknown) => {
      if (!val) return "2026-08-23";
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      const s = String(val).trim();
      return s.length >= 10 ? s.slice(0, 10) : s;
    };

    guides.push({
      title: data.title || fileName.replace(/\.md$/, ""),
      description: data.description || "",
      slug: data.slug || fileName.replace(/\.md$/, ""),
      date: formatDate(data.date),
      lastUpdated: formatDate(data.lastUpdated || data.date),
      author: data.author || "GetMerged Team",
      section: data.section || "Guides",
      keywords: data.keywords || [],
      jsonld: data.jsonld || undefined,
      readingTime: `${minutes} min read`,
    });
  }

  return guides;
}

export function getGuideBySlug(slug: string): GuidePost | null {
  const fullPath = path.join(GUIDES_DIR, `${slug}.md`);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);

  const formatDate = (val: unknown) => {
    if (!val) return "2026-08-23";
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    const s = String(val).trim();
    return s.length >= 10 ? s.slice(0, 10) : s;
  };

  return {
    title: data.title || slug,
    description: data.description || "",
    slug: data.slug || slug,
    date: formatDate(data.date),
    lastUpdated: formatDate(data.lastUpdated || data.date),
    author: data.author || "GetMerged Team",
    section: data.section || "Guides",
    keywords: data.keywords || [],
    jsonld: data.jsonld || undefined,
    readingTime: `${minutes} min read`,
    content,
  };
}
