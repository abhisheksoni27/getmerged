import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function RIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <rect width="24" height="24" rx="3" fill="#276DC3" />
      <path d="M8 7h4.5c1.7 0 2.8.8 2.8 2.2 0 1.1-.7 1.9-1.8 2.1l2.2 4.7H13l-1.8-4H10v4H8V7zm2 3.5h2.5c.6 0 1-.3 1-.8s-.4-.8-1-.8H10v1.6z" fill="#FFFFFF" />
    </SvgWrap>
  );
}
