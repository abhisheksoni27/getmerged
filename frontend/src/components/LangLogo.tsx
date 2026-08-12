import React from "react";

const SKILL_ICON_MAP: Record<string, string> = {
  go: "go",
  golang: "go",
  typescript: "ts",
  ts: "ts",
  javascript: "js",
  js: "js",
  python: "py",
  rust: "rust",
  "c++": "cpp",
  cpp: "cpp",
  java: "java",
  php: "php",
  ruby: "ruby",
  dart: "dart",
  kotlin: "kotlin",
  swift: "swift",
};

export function LangLogo({ language, className = "h-4 w-4" }: { language?: string; className?: string }) {
  if (!language) return null;

  const key = language.toLowerCase();
  const iconSlug = SKILL_ICON_MAP[key];

  if (!iconSlug) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://skillicons.dev/icons?i=${iconSlug}`}
      alt={language}
      width={20}
      height={20}
      className={`${className} object-contain shrink-0 rounded-xs`}
    />
  );
}
