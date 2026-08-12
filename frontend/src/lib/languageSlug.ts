export function getLanguageSlug(language: string): string {
  const normalized = language.trim().toLowerCase();

  if (normalized === "c#" || normalized === "csharp" || normalized === "c-sharp") return "csharp";
  if (normalized === "c++" || normalized === "cpp" || normalized === "cplusplus" || normalized === "c2b2b" || normalized === "c%2b%2b") return "cpp";
  if (normalized === "golang") return "go";

  return normalized
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function canonicalizeSlug(slug: string): string {
  if (!slug) return "";
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    decoded = slug;
  }
  return getLanguageSlug(decoded);
}

export function displayNameFromSlug(slug: string): string {
  const canonical = canonicalizeSlug(slug);
  switch (canonical) {
    case "typescript":
      return "TypeScript";
    case "javascript":
      return "JavaScript";
    case "cpp":
      return "C++";
    case "csharp":
      return "C#";
    case "go":
      return "Go";
    case "python":
      return "Python";
    case "rust":
      return "Rust";
    case "java":
      return "Java";
    case "php":
      return "PHP";
    case "html":
      return "HTML";
    case "css":
      return "CSS";
    case "ruby":
      return "Ruby";
    default:
      if (!canonical) return "";
      return canonical.charAt(0).toUpperCase() + canonical.slice(1);
  }
}
