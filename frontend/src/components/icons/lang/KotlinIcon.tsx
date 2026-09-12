import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function KotlinIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <defs>
        <linearGradient id="kt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7F52FF" />
          <stop offset="100%" stopColor="#C711E1" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="3" fill="url(#kt-grad)" />
      <path d="M4 4h16L12 12l8 8H4V4z" fill="#FFFFFF" opacity="0.9" />
    </SvgWrap>
  );
}
