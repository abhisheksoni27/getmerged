import React from "react";
import Link from "next/link";
import { Check, Activity } from "lucide-react";
import { UserMe } from "./pricing-types";
import { MAINTAINER_BASIC_PLAN, MAINTAINER_SLA_PLAN } from "./pricing-data";
import { PlanCard } from "./PlanCard";
import { GatedCheckoutButton } from "./GatedCheckoutButton";

interface MaintainersPaneProps {
  user: UserMe | null;
  onCheckout: (product: string, planCycle: "monthly" | "yearly") => void;
}

export function MaintainersPane({ user, onCheckout }: MaintainersPaneProps) {
  return (
    <div className="space-y-10">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-semibold mb-4">
          <Activity className="h-3.5 w-3.5" />
          <span>For Repository Owners & Open Source Maintainers</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-space text-[var(--text-primary)] tracking-tight mb-3">
          Claim Your Scorecard. Attract Better PRs.
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed">
          Showcase your team&apos;s review speed, embed official C-Rank badges, and pre-screen contributor submissions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <PlanCard
          plan={MAINTAINER_BASIC_PLAN}
          billingCycle="monthly"
          footer={
            <Link prefetch={false}
              href="/maintainers"
              className="w-full py-2.5 rounded-xl glass-card text-[var(--text-secondary)] font-mono font-bold text-xs uppercase tracking-wider text-center hover:bg-white/[0.08] transition-colors"
            >
              Claim Repository →
            </Link>
          }
        />

        <PlanCard
          plan={MAINTAINER_SLA_PLAN}
          billingCycle="monthly"
          icon={<Activity className="h-4 w-4 text-amber-700" />}
          footer={
            user?.has_maintainer_sla ? (
              <div className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-mono font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" />
                <span>Maintainer SLA Active</span>
              </div>
            ) : (
              <GatedCheckoutButton
                accent="amber"
                label="Upgrade Maintainer SLA"
                onClick={() => onCheckout("pdt_0Nmb34vLLQ8DBLbnrCXY5", "monthly")}
              />
            )
          }
        />
      </div>
    </div>
  );
}
