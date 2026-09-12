import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function TypeScriptIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#3178C6" />
      <path d="M4 10h6.5v2.2H7.9V20H5.5v-7.8H4V10zm11 5.9l1.8-1.1c.5.8 1.1 1.3 2.1 1.3.9 0 1.5-.4 1.5-1 0-.7-.5-1-1.6-1.5l-.6-.3c-1.7-.7-2.9-1.6-2.9-3.4 0-1.7 1.3-3 3.4-3 1.5 0 2.6.5 3.3 1.8l-1.7 1.1c-.4-.6-.8-.9-1.6-.9-.7 0-1.2.4-1.2 1 0 .6.4.9 1.4 1.3l.6.3c2 .8 3.1 1.7 3.1 3.6 0 2-1.6 3.1-3.8 3.1-2.1 0-3.4-1-4-2.4z" fill="#FFFFFF" />
    </SvgWrap>
  );
}
