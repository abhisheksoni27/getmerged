export interface SelectedRepo {
  full_name: string;
  owner: string;
  name: string;
  language?: string;
  stars?: number;
  c_rank_tier?: string;
  class_rank?: string;
  c_rank_score?: number;
  description?: string;
}

export interface PopularComparison {
  repoA: string;
  repoB: string;
  category: string;
}

export const POPULAR_COMPARISONS: PopularComparison[] = [
  {
    repoA: "facebook/react",
    repoB: "vuejs/vue",
    category: "Frontend UI Frameworks",
  },
  {
    repoA: "remix-run/remix",
    repoB: "vercel/next.js",
    category: "Full-Stack React Frameworks",
  },
  {
    repoA: "golang/go",
    repoB: "rust-lang/rust",
    category: "Systems & Backend Languages",
  },
  {
    repoA: "expressjs/express",
    repoB: "fastify/fastify",
    category: "Node.js Web Frameworks",
  },
  {
    repoA: "bootstrap",
    repoB: "tailwindlabs/tailwindcss",
    category: "CSS Systems & Utility Frameworks",
  },
  {
    repoA: "nodejs/node",
    repoB: "oven-sh/bun",
    category: "JavaScript Runtimes & Tooling",
  },
];

export function formatStarCount(stars: number): string {
  return stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : String(stars);
}
