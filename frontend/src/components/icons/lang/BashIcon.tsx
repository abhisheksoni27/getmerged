import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function BashIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#293134" />
      <path d="M6 8l4 4-4 4M12 16h6" stroke="#4EAA25" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </SvgWrap>
  );
}
