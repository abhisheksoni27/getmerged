"use client";

import React from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import type { User } from "@/types/opendoor";
import type { PublicProfile } from "@/lib/public-profile";
import ShareCardButton from "@/components/ShareCardButton";
import {
  Calendar,
  Edit3,
  FileText,
  LogOut,
  MoreVertical,
  Trash2,
  Sparkles,
  Zap,
} from "lucide-react";

interface ProfileHeaderProps {
  profile: PublicProfile;
  isOwner: boolean;
  currentUser: User | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onOpenEdit: () => void;
  onOpenResume: () => void;
  onOpenDelete: () => void;
  onLogout: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  isOwner,
  currentUser,
  menuRef,
  isMenuOpen,
  onToggleMenu,
  onOpenEdit,
  onOpenResume,
  onOpenDelete,
  onLogout,
}) => {
  if (!profile) return null;
  const dna = profile.dna;

  return (
    <div className="mb-8 rounded-xl glass-panel p-6 sm:p-8 border border-white/[0.1] border-t-2 border-t-slate-700 shadow-sm relative overflow-hidden">
      {/* Top Bar: Identity & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-4 min-w-0">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="h-16 w-16 sm:h-18 sm:w-18 rounded-xl border border-white/[0.12] bg-slate-800 shadow-md object-cover shrink-0"
            />
          ) : (
            <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-xl bg-slate-800 text-white flex items-center justify-center font-sans font-bold text-2xl shrink-0 border border-white/[0.12]">
              {profile.username.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-sans text-white truncate">
                {profile.username}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 text-zinc-300 text-xs font-mono border border-white/[0.12]">
                @{profile.slug}
              </span>
              {(profile.is_pro || (isOwner && currentUser?.is_pro)) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/40 shadow-sm shadow-emerald-950/40">
                  <Zap className="h-3 w-3 text-emerald-400 fill-emerald-400" />
                  PRO
                </span>
              )}
              {dna?.persona && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 text-xs font-mono font-bold border border-emerald-700/80">
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                  {dna.persona}
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-zinc-400 flex items-center gap-1.5 mt-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              Verified on GetMerged since{" "}
              {new Date(profile.member_since).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
              })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {isOwner && (
            <>
              <button
                type="button"
                onClick={onOpenEdit}
                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 hover:text-white border border-white/[0.12] text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                Edit
              </button>
              <button
                type="button"
                onClick={onLogout}
                title="Log out of GetMerged"
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/25 text-xs font-mono font-medium flex items-center gap-1 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span>Log out</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onOpenResume}
            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
            <span>Resume</span>
          </button>
          <ShareCardButton slug={profile.slug} username={profile.username} />

          {/* Triple Dots Actions Menu for Profile Owner */}
          {isOwner && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={onToggleMenu}
                title="More profile options"
                aria-label="More options"
                aria-expanded={isMenuOpen}
                className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-zinc-300 hover:text-white border border-white/[0.12] transition-all cursor-pointer flex items-center justify-center"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-slate-900/95 border border-white/[0.12] shadow-xl backdrop-blur-md py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={onOpenDelete}
                    className="w-full px-3 py-2 text-left text-xs font-mono text-rose-400 hover:text-rose-200 hover:bg-rose-500/15 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    <span>Delete Account</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Area: Headline & Full-Width Bio */}
      <div className="pt-4">
        {profile.headline && (
          <p className="text-sm font-semibold text-amber-300/90 font-sans leading-snug">
            {profile.headline}
          </p>
        )}

        {profile.bio ? (
          <p className="mt-2 text-sm text-zinc-200 leading-relaxed font-sans whitespace-pre-line">
            {profile.bio}
          </p>
        ) : isOwner ? (
          <button
            type="button"
            onClick={onOpenEdit}
            className="mt-2 text-xs font-mono text-zinc-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit3 className="h-3 w-3 text-amber-400" /> Add your bio...
          </button>
        ) : null}
      </div>

      {/* Owner Plan & Subscription Management Box */}
      {isOwner && currentUser?.is_pro && (
        <div className="mt-4 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-200">
              Active Subscription:{" "}
              <strong className="text-emerald-400 font-semibold uppercase">
                Pro ({currentUser.billing_cycle || "yearly"})
              </strong>
            </span>
            {currentUser.subscription_expires_at && (
              <span className="text-zinc-400">
                · Renews{" "}
                {new Date(currentUser.subscription_expires_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors"
            >
              View Plans
            </Link>
            <button
              type="button"
              onClick={async () => {
                if (confirm("Are you sure you want to cancel renewal for your Pro subscription? You will keep Pro access until your current period ends.")) {
                  try {
                    const res = await fetch(`${API_BASE_URL}/api/v1/user/pro/cancel`, {
                      method: "POST",
                      credentials: "include",
                    });
                    const data = await res.json();
                    alert(data.message || "Cancellation scheduled.");
                  } catch {
                    alert("Could not reach server. Please try again.");
                  }
                }
              }}
              className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/20 transition-colors cursor-pointer"
            >
              Cancel Renewal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
