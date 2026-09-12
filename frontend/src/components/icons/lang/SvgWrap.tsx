import React from "react";

interface SvgWrapProps {
  className?: string;
  size?: number;
  children: React.ReactNode;
}

export function SvgWrap({ className, size, children }: SvgWrapProps) {
  return (
    <svg
      className={className}
      width={size || 16}
      height={size || 16}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
