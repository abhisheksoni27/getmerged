import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function CSharpIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#68217A" />
      <path d="M11 8.5a4 4 0 0 0-4 4 4 4 0 0 0 4 4c1.8 0 3-1 3.6-2.2l-1.8-.9c-.4.7-1 1.1-1.8 1.1a2 2 0 0 1-2-2 2 2 0 0 1 2-2c.8 0 1.4.4 1.8 1.1l1.8-.9a4 4 0 0 0-3.6-2.2zm4.5 1.5h1l-.3 1.5h1.2l.3-1.5h1l-.3 1.5h1v1h-1.2l-.3 1.5h1.2v1h-1.4l-.3 1.5h-1l.3-1.5h-1.2l-.3 1.5h-1l.3-1.5h-1v-1h1.2l.3-1.5h-1.2v-1h1.4l.3-1.5zm1 2.5l-.3 1.5h1.2l.3-1.5h-1.2z" fill="#FFFFFF" />
    </SvgWrap>
  );
}
