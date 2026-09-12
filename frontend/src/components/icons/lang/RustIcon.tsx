import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function RustIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <circle cx="12" cy="12" r="10" fill="#DEA584" />
      <path d="M8 8h4.5c1.7 0 2.8.9 2.8 2.3 0 1-.6 1.8-1.6 2.1l2 3.6h-2.2l-1.7-3.2H9.8V16H8V8zm1.8 3.5h2.5c.7 0 1.2-.4 1.2-1s-.5-1-1.2-1H9.8v2z" fill="#111111" />
    </SvgWrap>
  );
}
