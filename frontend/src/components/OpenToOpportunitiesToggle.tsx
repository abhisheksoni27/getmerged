"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Briefcase } from "lucide-react";

interface OpenToOpportunitiesToggleProps {
  slug: string;
}

// Owner-only "Open to Opportunities" opt-in for the /u/[username] Contributor
// DNA profile (AC1). Renders nothing for public viewers or non-owners (AC5):
// the GET only returns data when the authed user owns the slug, else 403/401.
export default function OpenToOpportunitiesToggle({ slug }: OpenToOpportunitiesToggleProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/user/open-to-opportunities?slug=${encodeURIComponent(slug)}`,
          { credentials: "include", cache: "no-store" }
        );
        if (!res.ok) {
          // 401/403 → not the owner (or not logged in): render nothing (AC5).
          if (!cancelled) setIsOwner(false);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setIsOwner(true);
        setEnabled(Boolean(data.open_to_opportunities));
      } catch {
        if (!cancelled) setIsOwner(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!isOwner || loading) return null;

  async function onToggle(next: boolean) {
    setSaving(true);
    setError(null);
    const prev = enabled;
    setEnabled(next); // optimistic
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/open-to-opportunities`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ open_to_opportunities: next }),
      });
      if (!res.ok) {
        setEnabled(prev); // rollback on failure
        setError("Could not save. Try again.");
      }
    } catch {
      setEnabled(prev);
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border-2 border-brand-dark bg-white p-5 shadow-[4px_4px_0px_#222831]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-bold text-zinc-900">Open to Opportunities</span>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={enabled}
            disabled={saving}
            onChange={(e) => onToggle(e.target.checked)}
            aria-label="Open to Opportunities"
          />
          <div className="h-6 w-11 rounded-full bg-zinc-300 peer-checked:bg-emerald-600 peer-disabled:opacity-60 transition-colors" />
          <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
        </label>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Let recruiters with a Recruiter Pass discover you in search by your languages, skill level,
        contribution style, and verified S/A-tier merges.
      </p>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
