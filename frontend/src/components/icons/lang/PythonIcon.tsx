import { SvgWrap } from "./SvgWrap";
import type { LangIconProps } from "./types";

export function PythonIcon({ className, size }: LangIconProps) {
  return (
    <SvgWrap className={className} size={size}>
      <path d="M11.92 2C6.75 2 7.08 4.25 7.08 4.25l.01 2.22h4.91v.7H5.08S2 6.81 2 11.98s2.7 5.01 2.7 5.01h1.61v-2.38s-.09-2.7 2.65-2.7h4.55s2.56.04 2.56-2.5V4.5S16.59 2 11.92 2zm-2.6 1.48a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9z" fill="#387EB8" />
      <path d="M12.08 22c5.17 0 4.84-2.25 4.84-2.25l-.01-2.22h-4.91v-.7h6.92S22 17.19 22 12.02s-2.7-5.01-2.7-5.01h-1.61v2.38s.09 2.7-2.65 2.7h-4.55s-2.56-.04-2.56 2.5v4.91S7.41 22 12.08 22zm2.6-1.48a.95.95 0 1 1 0-1.9.95.95 0 0 1 0-1.9z" fill="#FFE052" />
    </SvgWrap>
  );
}
