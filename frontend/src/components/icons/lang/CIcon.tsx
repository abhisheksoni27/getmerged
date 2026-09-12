import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function CIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#A8B9CC" />
      <path d="M12.5 7.5a5 5 0 0 0-5 5 5 5 0 0 0 5 5c2.3 0 3.9-1.2 4.7-2.8l-2.4-1.2c-.5.9-1.3 1.5-2.3 1.5a2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1 2.5-2.5c1 0 1.8.6 2.3 1.5l2.4-1.2a5 5 0 0 0-4.7-2.8z" fill="#1C3C6B" />
    </SvgWrap>
  );
}
