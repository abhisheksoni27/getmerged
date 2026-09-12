import React from "react";
import { BillingCycle } from "./pricing-types";

type ToggleAccent = "emerald" | "blue";

const SAVE_BADGE: Record<ToggleAccent, string> = {
  emerald: "bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold",
  blue: "bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold",
};

interface BillingToggleProps {
  billingCycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  accent: ToggleAccent;
  saveLabel: string;
}

export function BillingToggle({ billingCycle, onChange, accent, saveLabel }: BillingToggleProps) {
  return (
    <div className="inline-flex items-center gap-2 p-1 bg-[#141414] rounded-xl mt-6 border border-white/[0.1] font-mono text-xs">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
          billingCycle === "monthly" ? "bg-white/[0.1] text-white shadow-sm" : "text-zinc-400 hover:text-white"
        }`}
      >
        Monthly Billing
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
          billingCycle === "yearly" ? "bg-white/[0.1] text-white shadow-sm" : "text-zinc-400 hover:text-white"
        }`}
      >
        Annual Billing
        <span className={SAVE_BADGE[accent]}>
          {saveLabel}
        </span>
      </button>
    </div>
  );
}
