import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function JavaScriptIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#F7DF1E" />
      <path d="M6.5 18.5l2-1.2c.4.7.8 1.2 1.5 1.2.8 0 1.3-.3 1.3-1.5v-7.2h2.5v7.2c0 2.4-1.4 3.4-3.6 3.4-1.9 0-3.1-.9-3.7-2.1zm8.3-.4l2-1.2c.5.9 1.3 1.5 2.4 1.5 1 0 1.6-.5 1.6-1.2 0-.8-.6-1.1-1.8-1.6l-.7-.3c-1.9-.8-3.2-1.8-3.2-3.8 0-1.9 1.5-3.3 3.8-3.3 1.7 0 2.9.6 3.7 2.1l-1.9 1.2c-.4-.7-.9-1-1.8-1-.8 0-1.4.5-1.4 1.1 0 .7.5 1 1.6 1.5l.7.3c2.2.9 3.5 1.9 3.5 4 0 2.3-1.8 3.5-4.2 3.5-2.4 0-3.8-1.2-4.3-2.8z" fill="#000000" />
    </SvgWrap>
  );
}
