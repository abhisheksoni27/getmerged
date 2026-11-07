import React from "react";
import { Check, Zap, Sparkles } from "lucide-react";
import { BillingCycle, UserMe } from "./pricing-types";
import { COMMUNITY_FREE_PLAN, PRO_CONTRIBUTOR_PLAN } from "./pricing-data";
import { PlanCard } from "./PlanCard";
import { BillingToggle } from "./BillingToggle";
import { GatedCheckoutButton } from "./GatedCheckoutButton";

interface ContributorsPaneProps {
  billingCycle: BillingCycle;
  onBillingChange: (cycle: BillingCycle) => void;
  user: UserMe | null;
  onCheckout: (product: string, planCycle: BillingCycle) => void;
}

export function ContributorsPane({ billingCycle, onBillingChange, user, onCheckout }: ContributorsPaneProps) {
  return (
    <div className="space-y-10">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          <span>For Open Source Contributors & Developers</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-space text-[var(--text-primary)] tracking-tight mb-3">
          Stop Guessing. Get Your Pull Requests Merged.
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed">
          Unlimited repository review velocity forecasts, live maintainer turnaround advice, and automated pre-flight checks.
        </p>

        <BillingToggle billingCycle={billingCycle} onChange={onBillingChange} accent="emerald" saveLabel="Save 28%" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <PlanCard
          plan={COMMUNITY_FREE_PLAN}
          billingCycle={billingCycle}
          footer={
            <button
              disabled
              className="w-full py-2.5 rounded-xl glass-card text-[var(--text-secondary)] font-mono font-bold text-xs uppercase tracking-wider text-center"
            >
              Current Plan
            </button>
          }
        />

        <PlanCard
          plan={PRO_CONTRIBUTOR_PLAN}
          billingCycle={billingCycle}
          icon={<Zap className="h-4 w-4 text-emerald-400 fill-emerald-400" />}
          footer={
            user?.is_pro ? (
              <div className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" />
                <span>Pro Plan Active ({user.billing_cycle ?? "yearly"})</span>
              </div>
            ) : (
              <GatedCheckoutButton
                accent="emerald"
                label="Upgrade to Pro Now"
                onClick={() => onCheckout("pdt_0Nmb34qDKDQU7BIeRzHUZ", billingCycle)}
              />
            )
          }
        />
      </div>
    </div>
  );
}
