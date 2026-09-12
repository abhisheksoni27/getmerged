import React from "react";
import { Check } from "lucide-react";
import { BillingCycle } from "./pricing-types";
import { PlanCardData, resolvePrice } from "./pricing-data";

const CARD_SHELL: Record<string, string> = {
  free: "rounded-2xl glass-panel p-6 sm:p-8 border border-white/[0.1] shadow-sm flex flex-col justify-between font-sans",
  emerald:
    "rounded-2xl glass-panel p-6 sm:p-8 border-2 border-emerald-500 shadow-xl shadow-emerald-950/20 flex flex-col justify-between relative font-sans",
  blue:
    "rounded-2xl glass-panel p-6 sm:p-8 border-2 border-blue-500 shadow-xl shadow-blue-950/20 flex flex-col justify-between relative font-sans",
  amber:
    "rounded-2xl glass-panel p-6 sm:p-8 border-2 border-amber-500 shadow-xl shadow-amber-950/20 flex flex-col justify-between relative font-sans",
};

const RIBBON: Record<string, string> = {
  emerald:
    "absolute -top-3 right-6 bg-emerald-500 text-black text-[11px] font-bold font-mono uppercase px-3 py-0.5 rounded-full shadow-sm",
  blue:
    "absolute -top-3 right-6 bg-blue-500 text-white text-[11px] font-bold font-mono uppercase px-3 py-0.5 rounded-full shadow-sm",
  amber:
    "absolute -top-3 right-6 bg-amber-500 text-black text-[11px] font-bold font-mono uppercase px-3 py-0.5 rounded-full shadow-sm",
};

const CHECK: Record<string, string> = {
  "emerald:free": "h-4 w-4 text-emerald-500 shrink-0",
  "emerald:featured": "h-4 w-4 text-emerald-400 shrink-0",
  "blue:free": "h-4 w-4 text-blue-400 shrink-0",
  "blue:featured": "h-4 w-4 text-blue-400 shrink-0",
  "amber:free": "h-4 w-4 text-amber-400 shrink-0",
  "amber:featured": "h-4 w-4 text-amber-400 shrink-0",
};

interface PlanCardProps {
  plan: PlanCardData;
  billingCycle: BillingCycle;
  icon?: React.ReactNode;
  footer: React.ReactNode;
}

/**
 * Data-driven plan card. Feature rows render via .map() over
 * plan.features; highlighted rows get white/medium emphasis,
 * muted rows render without a check icon.
 */
export function PlanCard({ plan, billingCycle, icon, footer }: PlanCardProps) {
  const { price, suffix } = resolvePrice(plan, billingCycle);
  const featured = plan.featured === true;
  const checkClass = CHECK[`${plan.accent}:${featured ? "featured" : "free"}`];
  const variablePrice = !("fixed" in plan.price);

  return (
    <div className={featured ? CARD_SHELL[plan.accent] : CARD_SHELL.free}>
      {featured && plan.ribbon && <div className={RIBBON[plan.accent]}>{plan.ribbon}</div>}

      <div>
        <div className="flex items-center justify-between mb-2 font-mono">
          <h2 className={`text-lg font-bold text-white${icon ? " flex items-center gap-1.5" : ""}`}>
            {icon}
            {plan.title}
          </h2>
          {!featured && plan.badge && (
            <span className="text-xs text-zinc-400 glass-card px-2 py-0.5 rounded">{plan.badge}</span>
          )}
        </div>
        <p className={`text-xs ${featured ? "text-zinc-300" : "text-zinc-400"} mb-6`}>{plan.description}</p>

        {variablePrice ? (
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold font-mono text-white">{price}</span>
            <span className="text-xs font-sans text-zinc-400">{suffix}</span>
          </div>
        ) : (
          <div className="text-3xl font-bold font-mono text-white mb-6">
            {price} <span className="text-xs font-normal font-sans text-zinc-400">{suffix}</span>
          </div>
        )}

        <ul className="space-y-3 text-xs text-zinc-300 mb-8">
          {plan.features.map((feature) =>
            feature.muted ? (
              <li key={feature.text} className="flex items-center gap-2.5 text-zinc-500">
                <span>{feature.text}</span>
              </li>
            ) : (
              <li
                key={feature.text}
                className={`flex items-center gap-2.5${feature.highlight ? " font-medium text-white" : ""}`}
              >
                <Check className={checkClass} />
                <span>{feature.text}</span>
              </li>
            )
          )}
        </ul>
      </div>

      {footer}
    </div>
  );
}
