"use client";

import React, { useEffect, useState } from "react";
import { Star, MessageSquare, ShieldCheck, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface FeedbackItem {
  id: number;
  maintainer_rating: number;
  review_speed_rating: number;
  beginner_rating: number;
  comment: string;
  verified_contributor: boolean;
  created_at: string;
}

interface RepoReviewsSectionProps {
  repoId: string;
  fullName: string;
}

export function RepoReviewsSection({ repoId, fullName }: RepoReviewsSectionProps) {
  const [reviews, setReviews] = useState<FeedbackItem[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [maintainerRating, setMaintainerRating] = useState(5);
  const [reviewSpeedRating, setReviewSpeedRating] = useState(5);
  const [beginnerRating, setBeginnerRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(repoId)}/feedback`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.feedback || data || []);
        }
      } catch {
        // Degrade gracefully
      }
    }
    if (repoId) {
      fetchReviews();
    }
  }, [repoId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          repo_id: repoId,
          full_name: fullName,
          maintainer_rating: maintainerRating,
          review_speed_rating: reviewSpeedRating,
          beginner_rating: beginnerRating,
          comment: comment.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit review. Please sign in.");
      }

      setSubmitted(true);
      setShowForm(false);
      // Reload reviews
      const reload = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(repoId)}/feedback`);
      if (reload.ok) {
        const data = await reload.json();
        setReviews(data.feedback || data || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${
              i <= count
                ? "text-amber-400 fill-amber-400"
                : "text-zinc-600"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-3xl glass-panel border border-[var(--border-subtle)] p-6 sm:p-8 bg-[var(--bg-surface)] shadow-xl space-y-6 text-[var(--text-primary)] font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Glassdoor for Open Source</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-space text-[var(--text-primary)]">
            Contributor Vibe & Maintainer Reviews
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Real experiences from developers who contributed pull requests to {fullName}.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"
        >
          {showForm ? "Cancel Review" : "Write a Review"}
        </button>
      </div>

      {submitted && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 font-mono text-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>Thank you! Your verified maintainer review has been recorded.</span>
        </div>
      )}

      {/* Review Submission Form */}
      {showForm && (
        <form onSubmit={handleSubmitReview} className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-emerald-500/30 space-y-4">
          <h4 className="text-sm font-bold font-space text-[var(--text-primary)]">
            Review Your Contribution Experience
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-[var(--text-secondary)]">Maintainer Mentorship:</label>
              <select
                value={maintainerRating}
                onChange={(e) => setMaintainerRating(Number(e.target.value))}
                className="w-full bg-black border border-[var(--border-subtle)] rounded-xl p-2 text-xs text-white font-mono"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5/5) Super Helpful</option>
                <option value={4}>⭐⭐⭐⭐ (4/5) Welcoming</option>
                <option value={3}>⭐⭐⭐ (3/5) Neutral</option>
                <option value={2}>⭐⭐ (2/5) Cold / Slow</option>
                <option value={1}>⭐ (1/5) Hostile</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-[var(--text-secondary)]">Review Speed:</label>
              <select
                value={reviewSpeedRating}
                onChange={(e) => setReviewSpeedRating(Number(e.target.value))}
                className="w-full bg-black border border-[var(--border-subtle)] rounded-xl p-2 text-xs text-white font-mono"
              >
                <option value={5}>⭐⭐⭐⭐⭐ Fast (&lt;24h)</option>
                <option value={4}>⭐⭐⭐⭐ Moderate (2-3d)</option>
                <option value={3}>⭐⭐⭐ Standard (1-2w)</option>
                <option value={2}>⭐⭐ Slow (&gt;2w)</option>
                <option value={1}>⭐ Ghosted</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-[var(--text-secondary)]">Beginner Friendly:</label>
              <select
                value={beginnerRating}
                onChange={(e) => setBeginnerRating(Number(e.target.value))}
                className="w-full bg-black border border-[var(--border-subtle)] rounded-xl p-2 text-xs text-white font-mono"
              >
                <option value={5}>⭐⭐⭐⭐⭐ Great for 1st timers</option>
                <option value={4}>⭐⭐⭐⭐ Good onboarding</option>
                <option value={3}>⭐⭐⭐ Needs prior context</option>
                <option value={2}>⭐⭐ Complex codebase</option>
                <option value={1}>⭐ Not beginner friendly</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-[var(--text-secondary)]">Your Feedback / Advice for Future Contributors:</label>
            <textarea
              rows={3}
              placeholder="What was it like getting your PR reviewed? Any tips for newcomers?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-black border border-[var(--border-subtle)] rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-2 text-red-300 font-mono text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{submitting ? "Submitting..." : "Post Verified Review"}</span>
          </button>
        </form>
      )}

      {/* Reviews Feed */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-tertiary)] text-xs font-mono">
          No contributor reviews yet. Be the first to leave feedback on {fullName}!
        </div>
      ) : (
        <div className="space-y-3.5">
          {reviews.map((r) => (
            <div key={r.id} className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {r.verified_contributor && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-semibold">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Verified Contributor</span>
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-secondary)]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[var(--text-secondary)]">Mentorship:</span>
                    {renderStars(r.maintainer_rating)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[var(--text-secondary)]">Speed:</span>
                    {renderStars(r.review_speed_rating)}
                  </div>
                </div>
              </div>

              {r.comment && (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                  &ldquo;{r.comment}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
