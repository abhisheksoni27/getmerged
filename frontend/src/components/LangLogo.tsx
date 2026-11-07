import React from "react";
import type { LangIconProps } from "./icons/lang/types";
import { PythonIcon } from "./icons/lang/PythonIcon";
import { JavaScriptIcon } from "./icons/lang/JavaScriptIcon";
import { TypeScriptIcon } from "./icons/lang/TypeScriptIcon";
import { GoIcon } from "./icons/lang/GoIcon";
import { RustIcon } from "./icons/lang/RustIcon";
import { JavaIcon } from "./icons/lang/JavaIcon";
import { CppIcon } from "./icons/lang/CppIcon";
import { CSharpIcon } from "./icons/lang/CSharpIcon";
import { CIcon } from "./icons/lang/CIcon";
import { PhpIcon } from "./icons/lang/PhpIcon";
import { RubyIcon } from "./icons/lang/RubyIcon";
import { KotlinIcon } from "./icons/lang/KotlinIcon";
import { SwiftIcon } from "./icons/lang/SwiftIcon";
import { DartIcon } from "./icons/lang/DartIcon";
import { BashIcon } from "./icons/lang/BashIcon";
import { HtmlIcon } from "./icons/lang/HtmlIcon";
import { CssIcon } from "./icons/lang/CssIcon";
import { ZigIcon } from "./icons/lang/ZigIcon";
import { ElixirIcon } from "./icons/lang/ElixirIcon";
import { ScalaIcon } from "./icons/lang/ScalaIcon";
import { LuaIcon } from "./icons/lang/LuaIcon";
import { RIcon } from "./icons/lang/RIcon";
import { ClojureIcon } from "./icons/lang/ClojureIcon";

export interface LangLogoProps {
  language?: string;
  className?: string;
  size?: number;
}

// Crisp, lightweight inline SVG logos for top programming ecosystems
// Replaces 1.5MB Devicon font and render-blocking CSS

type LogoRenderer = (props: LangIconProps) => React.ReactElement;

const SVG_LOGO_MAP: Record<string, LogoRenderer> = {
  javascript: JavaScriptIcon,
  js: JavaScriptIcon,
  typescript: TypeScriptIcon,
  ts: TypeScriptIcon,
  python: PythonIcon,
  py: PythonIcon,
  go: GoIcon,
  golang: GoIcon,
  rust: RustIcon,
  rs: RustIcon,
  java: JavaIcon,
  "c++": CppIcon,
  cpp: CppIcon,
  "c#": CSharpIcon,
  csharp: CSharpIcon,
  cs: CSharpIcon,
  c: CIcon,
  php: PhpIcon,
  ruby: RubyIcon,
  rb: RubyIcon,
  kotlin: KotlinIcon,
  kt: KotlinIcon,
  swift: SwiftIcon,
  sw: SwiftIcon,
  dart: DartIcon,
  elixir: ElixirIcon,
  ex: ElixirIcon,
  zig: ZigIcon,
  scala: ScalaIcon,
  html: HtmlIcon,
  css: CssIcon,
  shell: BashIcon,
  bash: BashIcon,
  lua: LuaIcon,
  r: RIcon,
  clojure: ClojureIcon,
};

function LangLogoInner({ language, className = "h-4 w-4", size }: LangLogoProps) {
  if (!language) return null;

  const key = language.toLowerCase().trim();
  const IconComponent = SVG_LOGO_MAP[key];

  if (IconComponent) {
    return (
      <span
        className={`${className} inline-flex items-center justify-center shrink-0 select-none leading-none`}
        title={language}
        aria-label={language}
        role="img"
      >
        <IconComponent className="w-full h-full" size={size} />
      </span>
    );
  }

  return (
    <span
      className={`${className} inline-flex items-center justify-center font-mono font-bold text-[8px] rounded-xs bg-zinc-800 border border-[var(--border-subtle)] text-[var(--text-secondary)] shrink-0 select-none`}
      title={language}
      aria-label={language}
      role="img"
    >
      {language.slice(0, 2).toUpperCase()}
    </span>
  );
}

export const LangLogo = React.memo(LangLogoInner);
