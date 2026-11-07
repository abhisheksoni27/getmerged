import React from "react";
import { BillingCycle } from "./pricing-types";

type ToggleAccent = "emerald" | "blue";

const SAVE_BADGE: Record<ToggleAccent, string> = {
  emerald: "bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] px-1.5 py-0.5 rounded-full font-bold",
  blue: "bg-sky-50 text-sky-800 border border-sky-200 text-[10px] px-1.5 py-0.5 rounded-full font-bold",
};

interface BillingToggleProps {
  billingCycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  accent: ToggleAccent;
  saveLabel: string;
}

export function BillingToggle({ billingCycle, onChange, accent, saveLabel }: BillingToggleProps) {
  return (
    <div className="inline-flex items-center gap-2 p-1 bg-[var(--bg-elevated)] rounded-xl mt-6 border border-[var(--border-subtle)] font-mono text-xs">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
          billingCycle === "monthly" ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        Monthly Billing
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
          billingCycle === "yearly" ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
