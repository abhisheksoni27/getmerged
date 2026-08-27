"use client";

import React from "react";
import { LogOut } from "lucide-react";
import posthog from "posthog-js";

export function LogoutButton() {
  const handleLogout = () => {
    posthog.capture("user_signed_out");
    posthog.reset();
    document.cookie = "opendoor_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    window.location.href = "/";
  };

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] glass-panel text-xs font-sans font-medium text-zinc-300 hover:text-white hover:border-white/[0.12] transition-colors cursor-pointer"
      title="Sign Out of GetMerged"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>Sign Out</span>
    </button>
  );
}
