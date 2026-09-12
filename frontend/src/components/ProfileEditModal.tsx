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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-white/[0.12] bg-[#121212] text-white shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#161616]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold font-sans">Customize Developer Profile</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/[0.08] px-6 bg-[#141414] text-xs font-mono">
          <button
            type="button"
            onClick={() => dispatch({ type: "setTab", tab: "about" })}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors ${
              state.activeTab === "about"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Bio & Headline
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "setTab", tab: "showcase" })}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              state.activeTab === "showcase"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Showcase Projects ({state.showcaseProjects.length})
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "setTab", tab: "repos" })}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              state.activeTab === "repos"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08] bg-[#161616]">
          <button
            type="button"
            onClick={onClose}
            disabled={state.isSaving}
            className="px-4 py-2 rounded-lg text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={state.isSaving}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-mono inline-flex items-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
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
