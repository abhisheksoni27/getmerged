"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import { getConsent } from "@/lib/consent";

export function PostHogInit() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured"
        );
      }
      return;
    }
    posthog.init(token, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: "2026-01-30",
      capture_exceptions: true,
      persistence: "memory",
      opt_out_capturing_by_default: true,
      debug: process.env.NODE_ENV === "development",
    });
    if (getConsent() === "accepted") {
      posthog.opt_in_capturing();
    }
  }, []);

  return null;
}
