import React from "react";

export interface LangLogoProps {
  language?: string;
  className?: string;
  size?: number;
}

// Crisp, lightweight inline SVG logos for top programming ecosystems
// Replaces 1.5MB Devicon font and render-blocking CSS
function PythonIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11.92 2C6.75 2 7.08 4.25 7.08 4.25l.01 2.22h4.91v.7H5.08S2 6.81 2 11.98s2.7 5.01 2.7 5.01h1.61v-2.38s-.09-2.7 2.65-2.7h4.55s2.56.04 2.56-2.5V4.5S16.59 2 11.92 2zm-2.6 1.48a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9z" fill="#387EB8" />
      <path d="M12.08 22c5.17 0 4.84-2.25 4.84-2.25l-.01-2.22h-4.91v-.7h6.92S22 17.19 22 12.02s-2.7-5.01-2.7-5.01h-1.61v2.38s.09 2.7-2.65 2.7h-4.55s-2.56-.04-2.56 2.5v4.91S7.41 22 12.08 22zm2.6-1.48a.95.95 0 1 1 0-1.9.95.95 0 0 1 0-1.9z" fill="#FFE052" />
    </svg>
  );
}

function JavaScriptIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#F7DF1E" />
      <path d="M6.5 18.5l2-1.2c.4.7.8 1.2 1.5 1.2.8 0 1.3-.3 1.3-1.5v-7.2h2.5v7.2c0 2.4-1.4 3.4-3.6 3.4-1.9 0-3.1-.9-3.7-2.1zm8.3-.4l2-1.2c.5.9 1.3 1.5 2.4 1.5 1 0 1.6-.5 1.6-1.2 0-.8-.6-1.1-1.8-1.6l-.7-.3c-1.9-.8-3.2-1.8-3.2-3.8 0-1.9 1.5-3.3 3.8-3.3 1.7 0 2.9.6 3.7 2.1l-1.9 1.2c-.4-.7-.9-1-1.8-1-.8 0-1.4.5-1.4 1.1 0 .7.5 1 1.6 1.5l.7.3c2.2.9 3.5 1.9 3.5 4 0 2.3-1.8 3.5-4.2 3.5-2.4 0-3.8-1.2-4.3-2.8z" fill="#000000" />
    </svg>
  );
}

function TypeScriptIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#3178C6" />
      <path d="M4 10h6.5v2.2H7.9V20H5.5v-7.8H4V10zm11 5.9l1.8-1.1c.5.8 1.1 1.3 2.1 1.3.9 0 1.5-.4 1.5-1 0-.7-.5-1-1.6-1.5l-.6-.3c-1.7-.7-2.9-1.6-2.9-3.4 0-1.7 1.3-3 3.4-3 1.5 0 2.6.5 3.3 1.8l-1.7 1.1c-.4-.6-.8-.9-1.6-.9-.7 0-1.2.4-1.2 1 0 .6.4.9 1.4 1.3l.6.3c2 .8 3.1 1.7 3.1 3.6 0 2-1.6 3.1-3.8 3.1-2.1 0-3.4-1-4-2.4z" fill="#FFFFFF" />
    </svg>
  );
}

function GoIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#00ADD8" />
      <path d="M10.8 12.2H7.2c-.1.6-.1 1.1 0 1.7.3 1.4 1.4 2.2 2.8 2.2 1.1 0 1.9-.5 2.3-1.3l1.8.8c-.8 1.5-2.3 2.4-4.1 2.4-2.7 0-4.8-2-4.8-4.9 0-2.8 2-5 4.8-5 2.9 0 4.7 2.1 4.7 5 0 .4 0 .7-.1.9-.7 0-2.8-.9-3.9-1.8zm6.4-1.4c1.8 0 3.3 1.5 3.3 3.3s-1.5 3.3-3.3 3.3-3.3-1.5-3.3-3.3 1.5-3.3 3.3-3.3zm0 1.9c-.8 0-1.4.6-1.4 1.4s.6 1.4 1.4 1.4 1.4-.6 1.4-1.4-.6-1.4-1.4-1.4z" fill="#FFFFFF" />
    </svg>
  );
}

function RustIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#DEA584" />
      <path d="M8 8h4.5c1.7 0 2.8.9 2.8 2.3 0 1-.6 1.8-1.6 2.1l2 3.6h-2.2l-1.7-3.2H9.8V16H8V8zm1.8 3.5h2.5c.7 0 1.2-.4 1.2-1s-.5-1-1.2-1H9.8v2z" fill="#111111" />
    </svg>
  );
}

function JavaIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.8 17.5s-1.2.3-.3.4c1.1.2 1.8.2 3.1-.1 1.3-.3 2.6-.7 3.5-.2.4.2.2.4.2.4s-.8.2-1.7.3c-.9.1-1.7.1-2.9 0-1.5-.1-1.9-.4-1.9-.4zm-.5 1.6s-.9.4.1.5c1 .2 1.9.2 3.5-.1 1.7-.3 3.2-.8 3.8-.1.2.2.1.3.1.3s-.9.2-1.9.3c-1 .1-2 .1-3.5 0-1.8-.2-2.1-.6-2.1-.6zm4.9-5.9c.7.8.4 1.5-.5 2.1-.8.6-1.7.7-2.8.3-.7-.3-.6-.7-.1-.9.7-.3 1.4-.4 2-.7.6-.3.9-.5 1.4-.8zm-4.7 7.7s-.6.5.6.6c1.4.1 2.9.2 5.1-.2 1.5-.3 2.1-.7 2.1-.7s-.5.3-1.5.4c-1.3.2-2.9.2-4.5.1-1.4-.1-1.8-.2-1.8-.2zm5.7-9.8c.8 1 .5 1.7-.5 2.4-.9.6-1.8.8-3.1.4-.8-.3-.6-.8-.1-1 .7-.3 1.6-.4 2.2-.8.6-.3 1-.6 1.5-1z" fill="#EA2D2E" />
      <path d="M12.4 2.5c-.7 1.3-1 2.5-.5 3.7.4.9 1.2 1.6 1.3 2.4.2 1.3-.6 2.3-1.6 3.3-.3-.8-.3-1.6 0-2.3.4-.8.9-1.4.7-2.3-.2-1.2-1.3-2.4-.4-4.8.2-.1.3-.1.5 0z" fill="#5382A1" />
    </svg>
  );
}

function CppIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#00599C" />
      <path d="M10.5 8.5a4 4 0 0 0-4 4 4 4 0 0 0 4 4c1.8 0 3-1 3.6-2.2l-1.8-.9c-.4.7-1 1.1-1.8 1.1a2 2 0 0 1-2-2 2 2 0 0 1 2-2c.8 0 1.4.4 1.8 1.1l1.8-.9a4 4 0 0 0-3.6-2.2zm4.5 3h1v-1h1v1h1v1h-1v1h-1v-1h-1v-1zm4.5 0h1v-1h1v1h1v1h-1v1h-1v-1h-1v-1z" fill="#FFFFFF" />
    </svg>
  );
}

function CSharpIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#68217A" />
      <path d="M11 8.5a4 4 0 0 0-4 4 4 4 0 0 0 4 4c1.8 0 3-1 3.6-2.2l-1.8-.9c-.4.7-1 1.1-1.8 1.1a2 2 0 0 1-2-2 2 2 0 0 1 2-2c.8 0 1.4.4 1.8 1.1l1.8-.9a4 4 0 0 0-3.6-2.2zm4.5 1.5h1l-.3 1.5h1.2l.3-1.5h1l-.3 1.5h1v1h-1.2l-.3 1.5h1.2v1h-1.4l-.3 1.5h-1l.3-1.5h-1.2l-.3 1.5h-1l.3-1.5h-1v-1h1.2l.3-1.5h-1.2v-1h1.4l.3-1.5zm1 2.5l-.3 1.5h1.2l.3-1.5h-1.2z" fill="#FFFFFF" />
    </svg>
  );
}

function CIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#A8B9CC" />
      <path d="M12.5 7.5a5 5 0 0 0-5 5 5 5 0 0 0 5 5c2.3 0 3.9-1.2 4.7-2.8l-2.4-1.2c-.5.9-1.3 1.5-2.3 1.5a2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1 2.5-2.5c1 0 1.8.6 2.3 1.5l2.4-1.2a5 5 0 0 0-4.7-2.8z" fill="#1C3C6B" />
    </svg>
  );
}

function PhpIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#777BB4" />
      <path d="M6 9h3c1.5 0 2.5.8 2.5 2s-1 2-2.5 2H7.5V16H6V9zm1.5 2.7h1.3c.7 0 1.2-.3 1.2-.7s-.5-.7-1.2-.7H7.5v1.4zm6.5-2.7h1.5v2.2H17V9h1.5v7H17v-2.5h-1.5V16H14V9zm-5 7" fill="#FFFFFF" />
    </svg>
  );
}

function RubyIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L3 8l3 12 6 3 6-3 3-12-9-6z" fill="#CC342D" />
      <path d="M12 2l4 6-4 14-4-14 4-6z" fill="#E65349" />
    </svg>
  );
}

function KotlinIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="kt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7F52FF" />
          <stop offset="100%" stopColor="#C711E1" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="3" fill="url(#kt-grad)" />
      <path d="M4 4h16L12 12l8 8H4V4z" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

function SwiftIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#F05138" />
      <path d="M19.5 15.5c-2.8 3.5-7.5 4.8-11.8 3.1 3.5-.9 6.3-3.2 7.7-6.2-3.1 1.7-6.8 1.9-10.1.6 4-2.5 7.4-5.9 9.8-9.8-1.5 2-3.4 3.7-5.5 5 1.5-1.5 2.8-3.3 3.8-5.3-4.5 4.7-9.5 7.8-10.2 8.3 4 5 10.6 7.4 16.3 4.3z" fill="#FFFFFF" />
    </svg>
  );
}

function DartIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#0175C2" />
      <path d="M4 14l5 5 9-9-5-5-9 9zm9.5-6.5l3 3-5 5-3-3 5-5z" fill="#FFFFFF" />
    </svg>
  );
}

function BashIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#293134" />
      <path d="M6 8l4 4-4 4M12 16h6" stroke="#4EAA25" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HtmlIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 3l1.5 16.5L12 21.5l6.5-2L20 3H4zm13.2 5.5h-8l.2 2.5h7.6l-.6 6-4.4 1.2-4.4-1.2-.3-3h2.3l.1 1.7 2.3.6 2.3-.6.3-2.7H6.8L6.2 6.5h11.2l-.2 2z" fill="#E34F26" />
    </svg>
  );
}

function CssIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 3l1.5 16.5L12 21.5l6.5-2L20 3H4zm13.2 5.5h-8l.2 2.5h7.6l-.6 6-4.4 1.2-4.4-1.2-.3-3h2.3l.1 1.7 2.3.6 2.3-.6.3-2.7H6.8L6.2 6.5h11.2l-.2 2z" fill="#1572B6" />
    </svg>
  );
}

function ZigIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#F7A41D" />
      <path d="M6 7h12l-7 10h7v2H6l7-10H6V7z" fill="#111111" />
    </svg>
  );
}

function ElixirIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5C12 2.5 6 10 6 15a6 6 0 0 0 12 0c0-5-6-12.5-6-12.5z" fill="#4B275F" />
      <path d="M12 5.5C12 5.5 8 11.5 8 15a4 4 0 0 0 8 0c0-3.5-4-9.5-4-9.5z" fill="#6E3A8C" />
    </svg>
  );
}

function ScalaIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#DC322F" />
      <path d="M6 6c6 0 12 2 12 6s-6 6-12 6V6z" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

function LuaIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#000080" />
      <circle cx="12" cy="12" r="6" fill="#FFFFFF" />
      <circle cx="16" cy="8" r="2" fill="#000080" />
    </svg>
  );
}

function RIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#276DC3" />
      <path d="M8 7h4.5c1.7 0 2.8.8 2.8 2.2 0 1.1-.7 1.9-1.8 2.1l2.2 4.7H13l-1.8-4H10v4H8V7zm2 3.5h2.5c.6 0 1-.3 1-.8s-.4-.8-1-.8H10v1.6z" fill="#FFFFFF" />
    </svg>
  );
}

function ClojureIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#5881D8" />
      <circle cx="12" cy="12" r="6" fill="#63B132" />
    </svg>
  );
}

type LogoRenderer = (props: { className?: string; size?: number }) => React.ReactElement;

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

export function LangLogo({ language, className = "h-4 w-4", size }: LangLogoProps) {
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
      className={`${className} inline-flex items-center justify-center font-mono font-bold text-[8px] rounded-xs bg-zinc-800 border border-white/[0.1] text-zinc-300 shrink-0 select-none`}
      title={language}
      aria-label={language}
      role="img"
    >
      {language.slice(0, 2).toUpperCase()}
    </span>
  );
}
