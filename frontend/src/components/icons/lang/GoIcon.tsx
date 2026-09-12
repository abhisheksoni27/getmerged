import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function GoIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#00ADD8" />
      <path d="M10.8 12.2H7.2c-.1.6-.1 1.1 0 1.7.3 1.4 1.4 2.2 2.8 2.2 1.1 0 1.9-.5 2.3-1.3l1.8.8c-.8 1.5-2.3 2.4-4.1 2.4-2.7 0-4.8-2-4.8-4.9 0-2.8 2-5 4.8-5 2.9 0 4.7 2.1 4.7 5 0 .4 0 .7-.1.9-.7 0-2.8-.9-3.9-1.8zm6.4-1.4c1.8 0 3.3 1.5 3.3 3.3s-1.5 3.3-3.3 3.3-3.3-1.5-3.3-3.3 1.5-3.3 3.3-3.3zm0 1.9c-.8 0-1.4.6-1.4 1.4s.6 1.4 1.4 1.4 1.4-.6 1.4-1.4-.6-1.4-1.4-1.4z" fill="#FFFFFF" />
    </SvgWrap>
  );
}
