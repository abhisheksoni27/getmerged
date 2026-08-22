import { useReducedMotion as framerUseReducedMotion } from "framer-motion";

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function useReducedMotion() {
  return framerUseReducedMotion();
}
