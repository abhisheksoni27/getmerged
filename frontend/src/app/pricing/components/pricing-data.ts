import { BillingCycle } from "./pricing-types";

export type PlanAccent = "emerald" | "blue" | "amber";

export interface PlanFeature {
  text: string;
  /** Rendered in white medium emphasis instead of zinc-300. */
  highlight?: boolean;
  /** Rendered muted without a check icon (e.g. masked/locked rows). */
  muted?: boolean;
}

export interface PlanPrice {
  monthly: string;
  yearly: string;
  monthlySuffix: string;
  yearlySuffix: string;
}

export interface PlanCardData {
  title: string;
  badge?: string;
  description: string;
  price: PlanPrice | { fixed: string; fixedSuffix: string };
  features: PlanFeature[];
  accent: PlanAccent;
  featured?: boolean;
  ribbon?: string;
}

export function resolvePrice(plan: PlanCardData, billingCycle: BillingCycle): { price: string; suffix: string } {
  if ("fixed" in plan.price) {
    return { price: plan.price.fixed, suffix: plan.price.fixedSuffix };
  }
  return billingCycle === "yearly"
    ? { price: plan.price.yearly, suffix: plan.price.yearlySuffix }
    : { price: plan.price.monthly, suffix: plan.price.monthlySuffix };
}

export const COMMUNITY_FREE_PLAN: PlanCardData = {
  title: "Community Free",
  badge: "Forever",
  description: "Essential tools for exploring repository maintainer responsiveness and finding beginner issues.",
  price: { fixed: "$0", fixedSuffix: "/ month" },
  accent: "emerald",
  features: [
    { text: "Public C-Rank™ metrics (S to D Tier)" },
    { text: "3 PR Likelihood evaluations per month" },
    { text: "Interactive Good First Issues search" },
    { text: "Embeddable dynamic SVG README badges" },
  ],
};

export const PRO_CONTRIBUTOR_PLAN: PlanCardData = {
  title: "Pro Contributor",
  description: "Supercharge your open-source journey with unlimited signals and maintainer intelligence.",
  price: { monthly: "$5", yearly: "$39", monthlySuffix: "/ month", yearlySuffix: "/ year ($3.25/mo)" },
  accent: "emerald",
  featured: true,
  ribbon: "Most Popular",
  features: [
    { text: "Unlimited PR Acceptance & Latency Forecasts", highlight: true },
    { text: "Maintainer Vibe Check & Uncensored PR Guidelines", highlight: true },
    { text: "Monday Morning Personalized Issue Match Digest" },
    { text: "Unlimited Static Pre-Flight PR Evaluator runs" },
    { text: "Contributor DNA badge & verified social card" },
  ],
};

export const TALENT_SEARCH_PLAN: PlanCardData = {
  title: "Talent Search",
  badge: "Free",
  description: "Browse public candidate pool, view merged PR count and language proficiencies.",
  price: { fixed: "$0", fixedSuffix: "/ month" },
  accent: "blue",
  features: [
    { text: "Public developer talent search directory" },
    { text: "Filter by primary programming language" },
    { text: "View top merged repositories" },
    { text: "Candidate direct contact details masked", muted: true },
  ],
};

export const FOUNDER_PASS_PLAN: PlanCardData = {
  title: "WorkDone Founder Pass",
  description: "Direct outreach access to top 5% open-source engineers actively open to new roles.",
  price: { monthly: "$25", yearly: "$195", monthlySuffix: "/ month", yearlySuffix: "/ year ($16.25/mo)" },
  accent: "blue",
  featured: true,
  ribbon: "For Founders & CTOs",
  features: [
    { text: "Direct candidate email & LinkedIn contact unlock", highlight: true },
    { text: "Karma Score & Level 4+ Senior Contributor filters", highlight: true },
    { text: "Verified PR merge history & codebase seniority dossiers" },
    { text: "Instant alerts when contributors in your tech stack open up" },
    { text: "High-credibility technical outreach dossiers with diff metrics" },
  ],
};

export const MAINTAINER_BASIC_PLAN: PlanCardData = {
  title: "Maintainer Basic",
  badge: "Free",
  description: "Claim your repository, verify maintainer ownership, and configure basic PR guidelines.",
  price: { fixed: "$0", fixedSuffix: "/ forever" },
  accent: "amber",
  features: [
    { text: "Claim official repository scorecard badge" },
    { text: "Set custom PR submission checklist" },
    { text: "Highlight top Good First Issues" },
  ],
};

export const MAINTAINER_SLA_PLAN: PlanCardData = {
  title: "Verified SLA Sponsor",
  description: "Promoted placement across GetMerged radar and automated contributor pre-qualification.",
  price: { fixed: "$15", fixedSuffix: "/ month" },
  accent: "amber",
  featured: true,
  ribbon: "Maintainer Pro",
  features: [
    { text: "Featured spotlight on Good First Issues feed", highlight: true },
    { text: "Automated PR pre-qualification bot via GitHub App", highlight: true },
    { text: "Verified Maintainer SLA badge in search directory" },
    { text: "Instant priority C-Rank rescoring queue" },
  ],
};
