/**
 * Global Feature Flags Configuration
 * Control feature availability across the GetMerged application.
 */

// Payments active switch (set to false to gracefully pause checkout & paywalls while Merchant of Record verification is pending)
export const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
