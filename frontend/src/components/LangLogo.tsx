import React from "react";

export interface LangLogoProps {
  language?: string;
  className?: string;
  size?: number;
}

const DEVICON_CLASS_MAP: Record<string, string> = {
  javascript: "devicon-javascript-plain colored",
  js: "devicon-javascript-plain colored",
  typescript: "devicon-typescript-plain colored",
  ts: "devicon-typescript-plain colored",
  python: "devicon-python-plain colored",
  py: "devicon-python-plain colored",
  go: "devicon-go-original-wordmark colored",
  golang: "devicon-go-original-wordmark colored",
  rust: "devicon-rust-plain",
  rs: "devicon-rust-plain",
  java: "devicon-java-plain colored",
  "c++": "devicon-cplusplus-plain colored",
  cpp: "devicon-cplusplus-plain colored",
  "c#": "devicon-csharp-plain colored",
  csharp: "devicon-csharp-plain colored",
  cs: "devicon-csharp-plain colored",
  c: "devicon-c-plain colored",
  php: "devicon-php-plain colored",
  ruby: "devicon-ruby-plain colored",
  rb: "devicon-ruby-plain colored",
  kotlin: "devicon-kotlin-plain colored",
  kt: "devicon-kotlin-plain colored",
  swift: "devicon-swift-plain colored",
  sw: "devicon-swift-plain colored",
  dart: "devicon-dart-plain colored",
  elixir: "devicon-elixir-plain colored",
  ex: "devicon-elixir-plain colored",
  zig: "devicon-zig-original colored",
  scala: "devicon-scala-plain colored",
  html: "devicon-html5-plain colored",
  css: "devicon-css3-plain colored",
  shell: "devicon-bash-plain colored",
  bash: "devicon-bash-plain colored",
  lua: "devicon-lua-plain colored",
  r: "devicon-r-plain colored",
  clojure: "devicon-clojure-plain colored",
};

export function LangLogo({ language, className = "h-4 w-4 text-sm", size }: LangLogoProps) {
  if (!language) return null;

  const key = language.toLowerCase().trim();
  const iconClass = DEVICON_CLASS_MAP[key];

  if (iconClass) {
    return (
      <i
        className={`${iconClass} ${className} inline-flex items-center justify-center shrink-0 select-none leading-none`}
        style={size ? { fontSize: `${size}px` } : undefined}
        title={language}
        aria-label={language}
      />
    );
  }

  return (
    <span
      className={`${className} inline-flex items-center justify-center font-mono font-bold text-[8px] rounded-xs bg-zinc-800 border border-white/[0.1] text-zinc-300 shrink-0 select-none`}
      title={language}
    >
      {language.slice(0, 2).toUpperCase()}
    </span>
  );
}
