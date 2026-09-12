export const FAMOUS_REPOS = [
  "facebook/react",
  "vuejs/vue",
  "vercel/next.js",
  "golang/go",
  "rust-lang/rust",
  "oven-sh/bun",
  "tailwindlabs/tailwindcss",
  "astral-sh/uv",
  "shadcn/ui",
  "huggingface/transformers",
  "supabase/supabase",
  "django/django",
];

export function parseGitHubInput(input: string): string {
  const trimmed = input.trim();
  const ghMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i);
  if (ghMatch) {
    const owner = ghMatch[1];
    const name = ghMatch[2].replace(/\.git$/i, "").replace(/\/.*$/, "");
    return `${owner}/${name}`;
  }
  return trimmed;
}
