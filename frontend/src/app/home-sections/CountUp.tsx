"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useMotionValue } from "framer-motion";
import { EASE_OUT_EXPO, useReducedMotion } from "@/lib/motion";

export function CountUp({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(value);
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!isInView) return;
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    count.set(0);
    const controls = animate(count, value, {
      duration,
      ease: EASE_OUT_EXPO,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [isInView, value, duration, reduceMotion, count]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}
