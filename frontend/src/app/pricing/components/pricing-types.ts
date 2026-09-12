export type AudienceTab = "contributors" | "recruiter" | "maintainers";

export type BillingCycle = "monthly" | "yearly";

export interface UserMe {
  slug: string;
  username: string;
  is_pro?: boolean;
  has_recruiter_pass?: boolean;
  has_maintainer_sla?: boolean;
  billing_cycle?: string;
}
