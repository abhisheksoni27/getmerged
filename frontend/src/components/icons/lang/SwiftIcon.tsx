import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function SwiftIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#F05138" />
      <path d="M19.5 15.5c-2.8 3.5-7.5 4.8-11.8 3.1 3.5-.9 6.3-3.2 7.7-6.2-3.1 1.7-6.8 1.9-10.1.6 4-2.5 7.4-5.9 9.8-9.8-1.5 2-3.4 3.7-5.5 5 1.5-1.5 2.8-3.3 3.8-5.3-4.5 4.7-9.5 7.8-10.2 8.3 4 5 10.6 7.4 16.3 4.3z" fill="#FFFFFF" />
    </SvgWrap>
  );
}
