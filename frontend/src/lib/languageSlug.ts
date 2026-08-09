export function getLanguageSlug(language: string) {
  const normalized = language.trim().toLowerCase();

  if (normalized === "c#") return "csharp";
  if (normalized === "c++") return "cpp";

  return normalized
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
