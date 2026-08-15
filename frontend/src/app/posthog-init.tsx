"use client";

import { useEffect } from "react";
import { getConsent } from "@/lib/consent";

export function PostHogInit() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token) return;

    const initPH = async () => {
      const { default: posthog } = await import("posthog-js");
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
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => initPH());
    } else {
      setTimeout(initPH, 1000);
    }
  }, []);

  return null;
}
