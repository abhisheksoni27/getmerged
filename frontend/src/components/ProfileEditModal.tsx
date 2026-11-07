"use client";

import React from "react";
import { Loader2, Save, Sparkles, X } from "lucide-react";
import type { PublicProfile } from "@/lib/public-profile";
import { API_BASE_URL } from "@/lib/api";
import { AboutSection } from "./profile-edit/AboutSection";
import { ReposSection } from "./profile-edit/ReposSection";
import { ShowcaseSection } from "./profile-edit/ShowcaseSection";
import { useProfileForm } from "./profile-edit/useProfileForm";
import { validateProfileForm } from "./profile-edit/validation";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicProfile;
  onProfileUpdated: (updated?: Partial<PublicProfile>) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const { state, dispatch } = useProfileForm(profile, isOpen);

  if (!isOpen) return null;

  const handleSave = async () => {
    const validationError = validateProfileForm(state);
    if (validationError) {
      dispatch({ type: "setError", error: validationError });
      return;
    }
    dispatch({ type: "setSaving", saving: true });
    dispatch({ type: "setError", error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          headline: state.headline.trim(),
          bio: state.bio.trim(),
          showcase_projects: state.showcaseProjects,
          pinned_repos: state.pinnedRepos,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile changes");
      }

      onProfileUpdated({
        headline: state.headline.trim(),
        bio: state.bio.trim(),
        showcase_projects: state.showcaseProjects,
      });
      onClose();
    } catch (err: unknown) {
      dispatch({ type: "setError", error: err instanceof Error ? err.message : "Failed to save profile" });
    } finally {
      dispatch({ type: "setSaving", saving: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--brand-terracotta)]" />
            <h2 className="text-lg font-bold font-sans">Customize Developer Profile</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-subtle)] px-6 bg-[var(--bg-surface)] text-xs font-mono">
          <button
            type="button"
            onClick={() => dispatch({ type: "setTab", tab: "about" })}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors ${
              state.activeTab === "about"
                ? "border-[var(--brand-terracotta)] text-[var(--brand-terracotta)] font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Bio & Headline
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "setTab", tab: "showcase" })}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              state.activeTab === "showcase"
                ? "border-[var(--brand-terracotta)] text-[var(--brand-terracotta)] font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Showcase Projects ({state.showcaseProjects.length})
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "setTab", tab: "repos" })}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              state.activeTab === "repos"
                ? "border-[var(--brand-terracotta)] text-[var(--brand-terracotta)] font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Pinned Repos ({state.pinnedRepos.length})
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {state.error && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono">
              {state.error}
            </div>
          )}

          {/* TAB 1: ABOUT / BIO */}
          {state.activeTab === "about" && (
            <AboutSection
              headline={state.headline}
              bio={state.bio}
              onHeadlineChange={(headline) => dispatch({ type: "setHeadline", headline })}
              onBioChange={(bio) => dispatch({ type: "setBio", bio })}
            />
          )}

          {/* TAB 2: SHOWCASE / PINNED PROJECTS WITH PHOTOS */}
          {state.activeTab === "showcase" && (
            <ShowcaseSection
              projects={state.showcaseProjects}
              onAdd={() => dispatch({ type: "addProject" })}
              onUpdate={(index, updated) => dispatch({ type: "updateProject", index, updated })}
              onRemove={(index) => dispatch({ type: "removeProject", index })}
            />
          )}

          {/* TAB 3: AUTO-POPULATED PUBLIC REPOS & PINNING */}
          {state.activeTab === "repos" && (
            <ReposSection
              repos={state.availableRepos}
              pinnedRepos={state.pinnedRepos}
              loading={state.loadingRepos}
              onTogglePin={(fullName) => dispatch({ type: "togglePin", fullName })}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <button
            type="button"
            onClick={onClose}
            disabled={state.isSaving}
            className="px-4 py-2 rounded-lg text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={state.isSaving}
            className="px-5 py-2 rounded-lg bg-[var(--brand-terracotta)] hover:bg-[var(--brand-terracotta)]/90 text-white text-xs font-bold font-mono inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {state.isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
