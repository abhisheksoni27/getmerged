import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function ScalaIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#DC322F" />
      <path d="M6 6c6 0 12 2 12 6s-6 6-12 6V6z" fill="#FFFFFF" opacity="0.9" />
    </SvgWrap>
  );
}
