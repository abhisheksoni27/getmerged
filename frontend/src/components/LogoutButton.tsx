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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200/80 bg-white text-xs font-sans font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-colors cursor-pointer"
      title="Sign Out of GetMerged"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>Sign Out</span>
    </button>
  );
}
