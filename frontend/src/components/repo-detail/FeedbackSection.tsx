"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  Flame,
  PartyPopper,
  RefreshCw,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { CurrentUser } from "./useRepoDetail";

interface SubmittedScores {
  maintainer: number;
  speed: number;
  beginner: number;
  comment: string;
  avg: number;
}

interface FeedbackSectionProps {
  repoId: string | number | undefined;
  fullName: string;
  currentUser: CurrentUser | null;
  isLoggedIn: boolean;
  onRequireAuth: (title: string, description: string, source: string) => void;
}

export function FeedbackSection({ repoId, fullName, currentUser, isLoggedIn, onRequireAuth }: FeedbackSectionProps) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [isVerifiedContributor, setIsVerifiedContributor] = useState(false);
  const [maintainerRating, setMaintainerRating] = useState(0);
  const [reviewSpeedRating, setReviewSpeedRating] = useState(0);
  const [beginnerRating, setBeginnerRating] = useState(0);
  const [submittedScores, setSubmittedScores] = useState<SubmittedScores | null>(null);

  const allFeedbackRatingsSelected = useMemo(
    () => maintainerRating > 0 && reviewSpeedRating > 0 && beginnerRating > 0,
    [maintainerRating, reviewSpeedRating, beginnerRating]
  );

  const handleSubmit = async () => {
    const commentEl = document.getElementById("feedback-comment") as HTMLTextAreaElement;
    if (!allFeedbackRatingsSelected) {
      setFeedbackError("Please select all 3 ratings.");
      return;
    }
    if (!isLoggedIn) {
      onRequireAuth(
        "Submit Contributor Ratings",
        "Sign in to verify your contributor signal and submit ratings.",
        "feedback_submit"
      );
      return;
    }
    setFeedbackError(null);
    const optionalComment = commentEl?.value.trim() || "";

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          repo_id: repoId || "",
          full_name: fullName,
          maintainer_rating: maintainerRating,
          review_speed_rating: reviewSpeedRating,
          beginner_rating: beginnerRating,
          comment: optionalComment,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        const avg = (maintainerRating + reviewSpeedRating + beginnerRating) / 3;
        setSubmittedScores({
          maintainer: maintainerRating,
          speed: reviewSpeedRating,
          beginner: beginnerRating,
          comment: optionalComment,
          avg,
        });
        setFeedbackSubmitted(true);
        if (result.verified_contributor) {
          setIsVerifiedContributor(true);
        }
        if (commentEl) commentEl.value = "";
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedbackError(err?.error || "Feedback submission failed.");
      }
    } catch (e) {
      console.error("Failed to submit feedback", e);
      setFeedbackError("Feedback submission failed. Check network status.");
    }
  };

  return (
    <section id="community-feedback" className="scroll-mt-36 card mb-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="live-dot" />
            <span>Contributor Reviews & Maintainer Feedback</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            Real contributor ratings on code review speed, maintainer helpfulness, and beginner receptivity.
          </p>
        </div>
        {currentUser ? (
          currentUser.auth_provider === "github" || currentUser.has_github ? (
            <span
              id="auth-provider-badge"
              data-testid="auth-provider-badge"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300 bg-emerald-500/15 px-3.5 py-1.5 rounded-lg border border-emerald-500/30 shadow-sm shrink-0"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Signed in with GitHub
            </span>
          ) : (
            <a
              id="auth-provider-badge"
              data-testid="auth-provider-badge"
              href={`${API_BASE_URL}/api/v1/auth/github`}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 px-3.5 py-1.5 rounded-lg border border-amber-500/30 shadow-sm transition-colors shrink-0 cursor-pointer"
              title="Link GitHub account to verify contributor status"
            >
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              Google Account (Link GitHub to verify)
            </a>
          )
        ) : (
          <button
            type="button"
            id="auth-provider-badge"
            data-testid="auth-provider-badge"
            onClick={() =>
              onRequireAuth(
                "Submit Repository Ratings",
                "Sign in to verify your contributor signal and submit ratings.",
                "feedback_verify"
              )
            }
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--text-secondary)] bg-white/[0.06] hover:bg-white/[0.12] hover:text-[var(--text-primary)] px-3.5 py-1.5 rounded-lg border border-[var(--border-subtle)] shadow-sm transition-colors cursor-pointer shrink-0"
            title="Sign in with GitHub to verify contributor status"
          >
            <ShieldCheck className="h-4 w-4 text-[var(--text-secondary)]" />
            Sign in to verify
          </button>
        )}
      </div>

      {/* Interactive Contributor Feedback Form / Thank You Widget */}
      <div className="bg-[#0D111A] border border-[var(--border-subtle)] rounded-lg p-5 overflow-hidden relative">
        {feedbackSubmitted && submittedScores ? (
          <div className="relative overflow-hidden rounded-xl border-2 border-[var(--border-subtle)] p-6 sm:p-8 animate-in zoom-in-95 duration-500 transition-all">
            {/* Dynamic Theme Gradients & Floating Particles Based on Rating */}
            {submittedScores.avg >= 4.5 ? (
              // S-TIER / GODLIKE CELEBRATION (Golden/Emerald Rainbow)
              <div className="absolute inset-0 glass-panel opacity-90 -z-10" />
            ) : submittedScores.avg >= 3.5 ? (
              // GREAT VIBES (Emerald & Cyan Sparkle)
              <div className="absolute inset-0 glass-panel opacity-90 -z-10" />
            ) : submittedScores.avg >= 2.5 ? (
              // BALANCED / NEUTRAL (Electric Violet & Amber)
              <div className="absolute inset-0 glass-panel opacity-90 -z-10" />
            ) : (
              // SPICY / CRITICAL (Crimson Warning Pulse)
              <div className="absolute inset-0 glass-panel opacity-90 -z-10" />
            )}

            {/* Floating Funky Emojis & Particle Burst */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
              <span className="absolute top-2 left-6 text-2xl animate-bounce duration-1000">
                {submittedScores.avg >= 4.5 ? "✨" : submittedScores.avg >= 3.5 ? "🚀" : submittedScores.avg >= 2.5 ? "⚡" : "🔥"}
              </span>
              <span className="absolute top-4 right-8 text-2xl animate-spin duration-3000">
                {submittedScores.avg >= 4.5 ? "👑" : submittedScores.avg >= 3.5 ? "🎉" : "💡"}
              </span>
              <span className="absolute bottom-3 left-10 text-xl animate-pulse">
                {submittedScores.avg >= 4.5 ? "⭐" : "🎯"}
              </span>
              <span className="absolute bottom-4 right-12 text-2xl animate-bounce">
                {submittedScores.avg >= 4.5 ? "🌟" : "🦾"}
              </span>
            </div>

            {/* Main Badge & Title */}
            <div className="flex flex-col items-center text-center space-y-4 relative z-10">
              <div className="relative">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-3 border-[var(--border-subtle)] glass-panel shadow-sm flex items-center justify-center -rotate-3 hover:rotate-0 transition-transform">
                  {submittedScores.avg >= 4.5 ? (
                    <Flame className="h-9 w-9 sm:h-11 sm:w-11 text-amber-500 animate-pulse fill-amber-400" />
                  ) : submittedScores.avg >= 3.5 ? (
                    <PartyPopper className="h-9 w-9 sm:h-11 sm:w-11 text-emerald-600 animate-bounce" />
                  ) : submittedScores.avg >= 2.5 ? (
                    <Zap className="h-9 w-9 sm:h-11 sm:w-11 text-indigo-600" />
                  ) : (
                    <Award className="h-9 w-9 sm:h-11 sm:w-11 text-rose-600" />
                  )}
                </div>
                {isVerifiedContributor && (
                  <span className="absolute -bottom-2 -right-2 rounded-full bg-emerald-500 p-1 border-2 border-[var(--border-subtle)] shadow-sm text-white" title="Verified Contributor Badge">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-[var(--border-subtle)] glass-panel text-[11px] font-mono font-extrabold uppercase tracking-wider shadow-sm">
                  {submittedScores.avg >= 4.5
                    ? "🏆 Legendary Maintainer Vibes"
                    : submittedScores.avg >= 3.5
                    ? "🌟 Super Welcoming Project"
                    : submittedScores.avg >= 2.5
                    ? "⚖️ Selective & Strict Reviews"
                    : "🚨 Tough Onboarding Curve"}
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold font-space text-[var(--text-primary)] tracking-tight">
                  Thank You for Scoring {fullName.split("/")[1] || fullName}!
                </h3>

                <p className="text-xs sm:text-sm font-sans text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                  {isVerifiedContributor
                    ? "Verified Contributor! Your review is confirmed by your public commit history on this repository."
                    : "Thank you! Your ratings have been recorded to help guide future community contributors."}
                </p>
              </div>

              {/* Scorecard Visual Breakdown */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-md pt-2">
                <div className="rounded-xl border-2 border-[var(--border-subtle)] glass-panel/90 backdrop-blur-xs p-2.5 sm:p-3 text-center shadow-sm">
                  <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] block">Helpfulness</span>
                  <span className="text-base sm:text-lg font-space font-extrabold text-[var(--text-primary)] flex items-center justify-center gap-1 mt-0.5">
                    {submittedScores.maintainer} <Star className="h-3 w-3 fill-yellow-400 text-brand-dark inline" />
                  </span>
                </div>
                <div className="rounded-xl border-2 border-[var(--border-subtle)] glass-panel/90 backdrop-blur-xs p-2.5 sm:p-3 text-center shadow-sm">
                  <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] block">Speed</span>
                  <span className="text-base sm:text-lg font-space font-extrabold text-[var(--text-primary)] flex items-center justify-center gap-1 mt-0.5">
                    {submittedScores.speed} <Star className="h-3 w-3 fill-yellow-400 text-brand-dark inline" />
                  </span>
                </div>
                <div className="rounded-xl border-2 border-[var(--border-subtle)] glass-panel/90 backdrop-blur-xs p-2.5 sm:p-3 text-center shadow-sm">
                  <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] block">Beginner</span>
                  <span className="text-base sm:text-lg font-space font-extrabold text-[var(--text-primary)] flex items-center justify-center gap-1 mt-0.5">
                    {submittedScores.beginner} <Star className="h-3 w-3 fill-yellow-400 text-brand-dark inline" />
                  </span>
                </div>
              </div>

              {/* Optional Comment Display if provided */}
              {submittedScores.comment && (
                <div className="w-full max-w-md rounded-xl border-2 border-[var(--border-subtle)] glass-panel/80 p-3 text-left shadow-sm">
                  <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-secondary)] block mb-1">Your review note:</span>
                  <p className="text-xs font-sans text-[var(--text-secondary)] italic">
                    &quot;{submittedScores.comment}&quot;
                  </p>
                </div>
              )}

              {/* Reset / Edit Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackSubmitted(false);
                    setMaintainerRating(submittedScores.maintainer);
                    setReviewSpeedRating(submittedScores.speed);
                    setBeginnerRating(submittedScores.beginner);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--border-subtle)] glass-panel px-4 py-2 text-xs font-mono font-bold text-[var(--text-primary)] shadow-sm hover:glass-card hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Update or Edit Ratings
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-5">
              <div>
                <h3 className="font-space text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
                  Have you contributed to {fullName.split("/")[1] || fullName}?
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Share your experience with code reviews, responsiveness, and onboarding to guide other external contributors.
                </p>
              </div>
              <span
                className={`inline-flex w-fit rounded-lg border px-3 py-1 text-[10px] font-mono font-bold shrink-0 shadow-sm ${
                  allFeedbackRatingsSelected
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    : "bg-white/[0.06] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                {allFeedbackRatingsSelected ? "✓ Ready to submit" : "3 ratings required"}
              </span>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "Maintainer helpfulness",
                  value: maintainerRating,
                  setValue: setMaintainerRating,
                },
                {
                  label: "Review speed",
                  value: reviewSpeedRating,
                  setValue: setReviewSpeedRating,
                },
                {
                  label: "Beginner friendliness",
                  value: beginnerRating,
                  setValue: setBeginnerRating,
                },
              ].map((rating) => (
                <div key={rating.label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                      {rating.label}
                    </span>
                    <div className="flex items-center gap-1.5" role="radiogroup" aria-label={rating.label}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => rating.setValue(star)}
                          aria-label={`${rating.label}: ${star} star${star === 1 ? "" : "s"}`}
                           className={`rounded-lg border p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center shadow-sm transition-all cursor-pointer ${
                             rating.value >= star
                               ? "bg-amber-400/20 border-amber-400/40 text-amber-300 scale-105"
                               : "border-[var(--border-subtle)] bg-white/[0.03] text-[var(--text-tertiary)] hover:bg-white/[0.08] hover:text-[var(--text-secondary)]"
                           }`}
                        >
                          <Star className={`h-4 w-4 ${rating.value >= star ? "fill-current" : ""}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {allFeedbackRatingsSelected && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Optional context
                  </label>
                  <textarea
                    id="feedback-comment"
                    rows={3}
                    placeholder={`Anything future contributors should know before opening a PR to ${fullName}?`}
                    className="w-full text-xs sm:text-sm font-sans rounded-xl border border-[var(--border-subtle)] p-3.5 bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-emerald-500/50 shadow-sm"
                  />
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!allFeedbackRatingsSelected}
                  className="flex ml-auto items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-white text-black hover:bg-zinc-200 px-6 py-3 font-mono text-xs font-bold shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-[var(--text-tertiary)] disabled:border-[var(--border-subtle)]"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Submit Contributor Rating
                </button>

                {feedbackError && (
                  <p className="text-xs font-mono text-rose-700 mt-2 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {feedbackError}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
