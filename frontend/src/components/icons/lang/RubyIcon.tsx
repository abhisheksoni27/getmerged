import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function RubyIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <path d="M12 2L3 8l3 12 6 3 6-3 3-12-9-6z" fill="#CC342D" />
      <path d="M12 2l4 6-4 14-4-14 4-6z" fill="#E65349" />
    </SvgWrap>
  );
}
