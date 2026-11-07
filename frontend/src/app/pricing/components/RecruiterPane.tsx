import React from "react";
import Link from "next/link";
import { Check, Briefcase } from "lucide-react";
import { BillingCycle, UserMe } from "./pricing-types";
import { TALENT_SEARCH_PLAN, FOUNDER_PASS_PLAN } from "./pricing-data";
import { PlanCard } from "./PlanCard";
import { BillingToggle } from "./BillingToggle";
import { GatedCheckoutButton } from "./GatedCheckoutButton";

interface RecruiterPaneProps {
  billingCycle: BillingCycle;
  onBillingChange: (cycle: BillingCycle) => void;
  user: UserMe | null;
  onCheckout: (product: string, planCycle: BillingCycle) => void;
}

export function RecruiterPane({ billingCycle, onBillingChange, user, onCheckout }: RecruiterPaneProps) {
  return (
    <div className="space-y-10">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-mono font-semibold mb-4">
          <Briefcase className="h-3.5 w-3.5" />
          <span>For Technical Founders, CTOs & Engineering Leaders</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-space text-[var(--text-primary)] tracking-tight mb-3">
          Stop Screening Resumes. Hire Verified Contributors.
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed">
          Source software engineers with proven merge records in Kubernetes, Next.js, Tokio, and production open-source infrastructure.
        </p>

        <BillingToggle billingCycle={billingCycle} onChange={onBillingChange} accent="blue" saveLabel="Save 35%" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <PlanCard
          plan={TALENT_SEARCH_PLAN}
          billingCycle={billingCycle}
          footer={
            <Link prefetch={false}
              href="/talent"
              className="w-full py-2.5 rounded-xl glass-card text-[var(--text-secondary)] font-mono font-bold text-xs uppercase tracking-wider text-center hover:bg-white/[0.08] transition-colors"
            >
              Browse Candidates →
            </Link>
          }
        />

        <PlanCard
          plan={FOUNDER_PASS_PLAN}
          billingCycle={billingCycle}
          icon={<Briefcase className="h-4 w-4 text-sky-700" />}
          footer={
            user?.has_recruiter_pass ? (
              <div className="w-full py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 font-mono font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" />
                <span>Founder Pass Active</span>
              </div>
            ) : (
              <GatedCheckoutButton
                accent="blue"
                label="Unlock Founder Pass ($25/mo)"
                onClick={() => onCheckout("pdt_0Nmb34u42gATqhr9H5ssc", billingCycle)}
              />
            )
          }
        />
      </div>
    </div>
  );
}
