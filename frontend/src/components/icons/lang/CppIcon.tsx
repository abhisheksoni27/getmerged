import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function CppIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#00599C" />
      <path d="M10.5 8.5a4 4 0 0 0-4 4 4 4 0 0 0 4 4c1.8 0 3-1 3.6-2.2l-1.8-.9c-.4.7-1 1.1-1.8 1.1a2 2 0 0 1-2-2 2 2 0 0 1 2-2c.8 0 1.4.4 1.8 1.1l1.8-.9a4 4 0 0 0-3.6-2.2zm4.5 3h1v-1h1v1h1v1h-1v1h-1v-1h-1v-1zm4.5 0h1v-1h1v1h1v1h-1v1h-1v-1h-1v-1z" fill="#FFFFFF" />
    </SvgWrap>
  );
}
