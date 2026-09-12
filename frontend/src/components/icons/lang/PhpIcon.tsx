import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function PhpIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#777BB4" />
      <path d="M6 9h3c1.5 0 2.5.8 2.5 2s-1 2-2.5 2H7.5V16H6V9zm1.5 2.7h1.3c.7 0 1.2-.3 1.2-.7s-.5-.7-1.2-.7H7.5v1.4zm6.5-2.7h1.5v2.2H17V9h1.5v7H17v-2.5h-1.5V16H14V9zm-5 7" fill="#FFFFFF" />
    </SvgWrap>
  );
}
