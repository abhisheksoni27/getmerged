"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LangLogo } from "@/components/LangLogo";
import { UserFeedbackItem } from "@/types/opendoor";
import { ShieldCheck, Star, Trash2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface UserFeedbackListProps {
  initialFeedback: UserFeedbackItem[];
  profileSlug: string;
  currentUserSlug?: string;
}

export function UserFeedbackList({
  initialFeedback,
  profileSlug,
  currentUserSlug,
}: UserFeedbackListProps) {
  const [feedback, setFeedback] = useState<UserFeedbackItem[]>(initialFeedback);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isOwner = currentUserSlug && currentUserSlug.toLowerCase() === profileSlug.toLowerCase();

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/feedback/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setFeedback((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert("Failed to delete review. Please ensure you are logged in.");
      }
    } catch {
      alert("Failed to delete review. Network error.");
    } finally {
      setDeletingId(null);
    }
  };

  if (feedback.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/60 p-8 text-center font-sans">
        <p className="text-sm font-semibold text-zinc-800">No community reviews submitted yet</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          Reviews left on repositories will appear here with ratings and sentiment telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      {feedback.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-2xs transition-all"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {item.repo_language && <LangLogo language={item.repo_language} />}
              <Link
                href={`/${item.repo_full_name}`}
                title={`View ${item.repo_full_name} C-Rank scorecard`}
                className="text-sm font-space font-bold text-zinc-900 hover:text-orange-600 transition-colors truncate"
              >
                {item.repo_full_name}
              </Link>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {item.verified_contributor && (
                <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Verified Contributor</span>
                </span>
              )}
              <span className="text-[11px] font-mono text-zinc-400">
                {new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  title="Delete this review"
                  className="rounded-lg p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Ratings Breakdown */}
          <div className="grid grid-cols-3 gap-2 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 text-xs mb-3">
            <div>
              <span className="text-zinc-500 text-[11px] block">Maintainer</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                <strong className="text-zinc-900 font-mono">{item.maintainer_rating}/5</strong>
              </div>
            </div>
            <div>
              <span className="text-zinc-500 text-[11px] block">Review Speed</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                <strong className="text-zinc-900 font-mono">{item.review_speed_rating}/5</strong>
              </div>
            </div>
            <div>
              <span className="text-zinc-500 text-[11px] block">Beginner Friendly</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                <strong className="text-zinc-900 font-mono">{item.beginner_rating}/5</strong>
              </div>
            </div>
          </div>

          {item.comment && (
            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed italic bg-white border border-zinc-100 rounded-xl p-3.5">
              &ldquo;{item.comment}&rdquo;
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
