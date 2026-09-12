import React from "react";
import { ArrowRight } from "lucide-react";

type CtaAccent = "emerald" | "blue" | "amber";

const CTA_CLASS: Record<CtaAccent, string> = {
  emerald:
    "w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-[0.98]",
  blue:
    "w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 cursor-pointer active:scale-[0.98]",
  amber:
    "w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer active:scale-[0.98]",
};

interface GatedCheckoutButtonProps {
  accent: CtaAccent;
  label: string;
  onClick: () => void;
}

/**
 * Gated CTA: the parent's handleCheckout routes through the
 * PAYMENTS_ENABLED verification gate (scrolls the notice into view)
 * before hitting any checkout endpoint.
 */
export function GatedCheckoutButton({ accent, label, onClick }: GatedCheckoutButtonProps) {
  return (
    <button type="button" onClick={onClick} className={CTA_CLASS[accent]}>
      <span>{label}</span>
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}
