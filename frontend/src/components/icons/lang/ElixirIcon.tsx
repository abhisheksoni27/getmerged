import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function ElixirIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <path d="M12 2.5C12 2.5 6 10 6 15a6 6 0 0 0 12 0c0-5-6-12.5-6-12.5z" fill="#4B275F" />
      <path d="M12 5.5C12 5.5 8 11.5 8 15a4 4 0 0 0 8 0c0-3.5-4-9.5-4-9.5z" fill="#6E3A8C" />
    </SvgWrap>
  );
}
