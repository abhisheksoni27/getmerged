"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PAYMENTS_ENABLED } from "@/lib/flags";
import { AudienceTab, BillingCycle, UserMe } from "./components/pricing-types";
import { PricingHeader } from "./components/PricingHeader";
import { AudienceTabs } from "./components/AudienceTabs";
import { StatusBanners } from "./components/StatusBanners";
import { ContributorsPane } from "./components/ContributorsPane";
import { RecruiterPane } from "./components/RecruiterPane";
import { MaintainersPane } from "./components/MaintainersPane";
import { TrustFooter } from "./components/TrustFooter";

export default function PricingClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") as AudienceTab | null;
  const isCheckoutSuccess = searchParams.get("checkout") === "success" || searchParams.get("welcome") === "1";

  const [activeTab, setActiveTab] = useState<AudienceTab>(
    initialTab && ["contributors", "recruiter", "maintainers"].includes(initialTab)
      ? initialTab
      : "contributors"
  );

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const [user, setUser] = useState<UserMe | null>(null);
  const noticeRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as AudienceTab | null;
    if (tabParam && ["contributors", "recruiter", "maintainers"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleCheckout = async (product: string, planCycle: "monthly" | "yearly") => {
    if (!PAYMENTS_ENABLED) {
      setShowVerificationNotice(true);
      if (noticeRef.current) {
        noticeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    let endpoint = "";
    if (product === "pdt_0Nmb34qDKDQU7BIeRzHUZ" || product === "pdt_opendoor_pro") {
      endpoint = `/api/v1/user/pro/checkout?billing_cycle=${planCycle}`;
    } else if (product === "pdt_0Nmb34u42gATqhr9H5ssc" || product === "pdt_recruiter_pass") {
      endpoint = `/api/v1/user/recruiter-pass/checkout?billing_cycle=${planCycle}`;
    } else if (product === "pdt_0Nmb34vLLQ8DBLbnrCXY5" || product === "pdt_maintainer_sla") {
      endpoint = "/api/v1/user/maintainer-sla/checkout";
    }

    if (endpoint) {
      try {
        const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" } });
        const data = await res.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
          return;
        }
      } catch (e) {
        console.error("checkout session failed", e);
      }
    }
    const targetProduct = product === "pdt_0Nmb34qDKDQU7BIeRzHUZ" && planCycle === "yearly" ? "pdt_0Nmb34qlI3XGXRYvor2xg" : product;
    window.location.href = `https://checkout.dodopayments.com/buy/${targetProduct}?billing_cycle=${planCycle}`;
  };

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header Section */}
      <PricingHeader />

      {/* Audience Selector Tabs */}
      <AudienceTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Checkout Success Banner */}
      {/* Merchant verification banner */}
      <StatusBanners
        isCheckoutSuccess={isCheckoutSuccess}
        showVerificationNotice={showVerificationNotice}
        noticeRef={noticeRef}
      />

      {/* TAB 1: CONTRIBUTORS PRICING */}
      {activeTab === "contributors" && (
        <ContributorsPane
          billingCycle={billingCycle}
          onBillingChange={setBillingCycle}
          user={user}
          onCheckout={handleCheckout}
        />
      )}

      {/* TAB 2: B2B HIRING FOR CTOS & FOUNDERS */}
      {activeTab === "recruiter" && (
        <RecruiterPane
          billingCycle={billingCycle}
          onBillingChange={setBillingCycle}
          user={user}
          onCheckout={handleCheckout}
        />
      )}

      {/* TAB 3: MAINTAINERS PRICING */}
      {activeTab === "maintainers" && (
        <MaintainersPane user={user} onCheckout={handleCheckout} />
      )}

      {/* Guarantee & Trust Footer Banner */}
      <TrustFooter />
    </div>
  );
}
