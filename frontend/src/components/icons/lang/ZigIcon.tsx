import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function ZigIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#F7A41D" />
      <path d="M6 7h12l-7 10h7v2H6l7-10H6V7z" fill="#111111" />
    </SvgWrap>
  );
}
