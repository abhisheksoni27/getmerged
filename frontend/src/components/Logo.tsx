import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
}

export function Logo({ size = "md", showWordmark = true, className = "" }: LogoProps) {
  const pixelSize = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48,
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 group shrink-0 select-none ${className}`}>
      {/* Glitch Quantum Shards Master Icon */}
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform group-hover:scale-105 duration-200"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="#0a0f0d" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
        {/* Top Glitch branch (Emerald / Mint) */}
        <rect x="5" y="9" width="6" height="3" rx="0.5" fill="#10b981" />
        <rect x="12" y="11" width="4" height="3" rx="0.5" fill="#34d399" />
        {/* Bottom Glitch branch (Crimson / Amber PR) */}
        <rect x="5" y="20" width="6" height="3" rx="0.5" fill="#ff3b30" />
        <rect x="12" y="18" width="4" height="3" rx="0.5" fill="#ff9500" />
        {/* Converged high-tech core & quantum sparks */}
        <rect x="17" y="13.5" width="7" height="5" rx="0.75" fill="#10b981" />
        <rect x="25" y="15" width="2" height="2" fill="#ffffff" />
        <rect x="19" y="9.5" width="2" height="2" fill="#38bdf8" />
        <rect x="19" y="20.5" width="2" height="2" fill="#f59e0b" />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <span className="font-space text-sm font-bold tracking-tight text-white group-hover:text-[var(--text-primary)] transition-colors">
          Get<span className="text-[#10b981]">Merged</span>
        </span>
      )}
    </div>
  );
}

export default Logo;
