import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function CssIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <path d="M4 3l1.5 16.5L12 21.5l6.5-2L20 3H4zm13.2 5.5h-8l.2 2.5h7.6l-.6 6-4.4 1.2-4.4-1.2-.3-3h2.3l.1 1.7 2.3.6 2.3-.6.3-2.7H6.8L6.2 6.5h11.2l-.2 2z" fill="#1572B6" />
    </SvgWrap>
  );
}
