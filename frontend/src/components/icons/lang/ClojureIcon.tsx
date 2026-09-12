import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function ClojureIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <circle cx="12" cy="12" r="10" fill="#5881D8" />
      <circle cx="12" cy="12" r="6" fill="#63B132" />
    </SvgWrap>
  );
}
