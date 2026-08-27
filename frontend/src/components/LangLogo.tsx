const LANG_COLOR_MAP: Record<string, { bg: string; text: string; label: string }> = {
  go: { bg: "#00ADD8", text: "#FFFFFF", label: "Go" },
  golang: { bg: "#00ADD8", text: "#FFFFFF", label: "Go" },
  typescript: { bg: "#3178C6", text: "#FFFFFF", label: "TS" },
  ts: { bg: "#3178C6", text: "#FFFFFF", label: "TS" },
  javascript: { bg: "#F7DF1E", text: "#000000", label: "JS" },
  js: { bg: "#F7DF1E", text: "#000000", label: "JS" },
  python: { bg: "#3776AB", text: "#FFFFFF", label: "Py" },
  rust: { bg: "#000000", text: "#FFFFFF", label: "Rs" },
  "c++": { bg: "#00599C", text: "#FFFFFF", label: "C++" },
  cpp: { bg: "#00599C", text: "#FFFFFF", label: "C++" },
  "c#": { bg: "#239120", text: "#FFFFFF", label: "C#" },
  csharp: { bg: "#239120", text: "#FFFFFF", label: "C#" },
  cs: { bg: "#239120", text: "#FFFFFF", label: "C#" },
  java: { bg: "#007396", text: "#FFFFFF", label: "Java" },
  php: { bg: "#777BB4", text: "#FFFFFF", label: "PHP" },
  ruby: { bg: "#CC342D", text: "#FFFFFF", label: "Rb" },
  dart: { bg: "#0175C2", text: "#FFFFFF", label: "Dart" },
  kotlin: { bg: "#7F52FF", text: "#FFFFFF", label: "Kt" },
  swift: { bg: "#F05138", text: "#FFFFFF", label: "Swift" },
  elixir: { bg: "#4B275F", text: "#FFFFFF", label: "Ex" },
  zig: { bg: "#EC915C", text: "#000000", label: "Zig" },
};

export function LangLogo({ language, className = "h-4 w-4" }: { language?: string; className?: string }) {
  if (!language) return null;

  const key = language.toLowerCase().trim();
  const conf = LANG_COLOR_MAP[key] || { bg: "#18181b", text: "#ffffff", label: language.slice(0, 2).toUpperCase() };

  return (
    <span
      className={`${className} inline-flex items-center justify-center font-mono font-bold text-[9px] rounded-xs shrink-0 select-none shadow-2xs border border-white/[0.08]/20`}
      style={{ backgroundColor: conf.bg, color: conf.text }}
      title={language}
      aria-label={language}
    >
      {conf.label}
    </span>
  );
}
