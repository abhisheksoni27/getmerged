import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function LuaIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#000080" />
      <circle cx="12" cy="12" r="6" fill="#FFFFFF" />
      <circle cx="16" cy="8" r="2" fill="#000080" />
    </SvgWrap>
  );
}
