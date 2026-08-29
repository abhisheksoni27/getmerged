import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

export function Logo({ size = "md", showWordmark = true, className = "" }: LogoProps) {
  const iconDimensions = {
    sm: { box: "h-7 w-7 rounded-lg text-[11px]", dot: "h-1.5 w-1.5 top-1 right-1" },
    md: { box: "h-8 w-8 rounded-lg text-xs", dot: "h-1.5 w-1.5 top-1.5 right-1.5" },
    lg: { box: "h-10 w-10 rounded-xl text-sm", dot: "h-2 w-2 top-2 right-2" },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 group shrink-0 select-none ${className}`}>
      {/* Favicon-matching Icon Mark */}
      <div
        className={`relative ${iconDimensions.box} bg-[#222831] border border-white/[0.12] shadow-sm flex items-center justify-center transition-transform group-hover:scale-105 duration-200`}
        aria-hidden="true"
      >
        <span className="font-space font-bold text-white tracking-tight text-center leading-none">
          GM
        </span>
        {/* Signature Favicon Accent Dot */}
        <span
          className={`absolute ${iconDimensions.dot} rounded-full bg-[#dfd0b8] ring-1 ring-[#222831] shadow-[0_0_6px_rgba(223,208,184,0.6)]`}
        />
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <span className="font-space text-sm font-bold tracking-tight text-white group-hover:text-white transition-colors">
          GetMerged
        </span>
      )}
    </div>
  );
}

export default Logo;
