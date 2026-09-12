import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function DartIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#0175C2" />
      <path d="M4 14l5 5 9-9-5-5-9 9zm9.5-6.5l3 3-5 5-3-3 5-5z" fill="#FFFFFF" />
    </SvgWrap>
  );
}
