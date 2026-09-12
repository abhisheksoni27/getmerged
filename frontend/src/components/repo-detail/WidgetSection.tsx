"use client";

import React from "react";

interface WidgetSectionProps {
  id?: string;
  className?: string;
  /** When false, renders nothing - replaces repeated `{cond && (<section ...>)}` blocks. */
  show?: boolean;
  children: React.ReactNode;
}

export function WidgetSection({ id, className, show = true, children }: WidgetSectionProps) {
  if (!show) return null;
  return (
    <section id={id} className={className}>
      {children}
    </section>
  );
}
