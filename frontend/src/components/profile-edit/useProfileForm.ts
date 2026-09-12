import { useEffect, useReducer } from "react";
import type { PublicProfile, ShowcaseProject, UserPublicRepo } from "@/lib/public-profile";
import { API_BASE_URL } from "@/lib/api";

export type ProfileFormTab = "about" | "showcase" | "repos";

export interface ProfileFormState {
  headline: string;
  bio: string;
  showcaseProjects: ShowcaseProject[];
  pinnedRepos: string[];
  availableRepos: UserPublicRepo[];
  loadingRepos: boolean;
  isSaving: boolean;
  activeTab: ProfileFormTab;
  error: string | null;
}

export type ProfileFormAction =
  | { type: "reset"; profile: PublicProfile }
  | { type: "setHeadline"; headline: string }
  | { type: "setBio"; bio: string }
  | { type: "addProject" }
  | { type: "updateProject"; index: number; updated: Partial<ShowcaseProject> }
  | { type: "removeProject"; index: number }
  | { type: "togglePin"; fullName: string }
  | { type: "setAvailableRepos"; repos: UserPublicRepo[] }
  | { type: "setLoadingRepos"; loading: boolean }
  | { type: "setSaving"; saving: boolean }
  | { type: "setTab"; tab: ProfileFormTab }
  | { type: "setError"; error: string | null };

export function initialProfileFormState(profile: PublicProfile): ProfileFormState {
  return {
    headline: profile.headline || "",
    bio: profile.bio || "",
    showcaseProjects: profile.showcase_projects || [],
    pinnedRepos: (profile.public_repos || []).filter((r) => r.is_pinned).map((r) => r.full_name),
    availableRepos: profile.public_repos || [],
    loadingRepos: false,
    isSaving: false,
    activeTab: "about",
    error: null,
  };
}

export function profileFormReducer(state: ProfileFormState, action: ProfileFormAction): ProfileFormState {
  switch (action.type) {
    case "reset":
      return initialProfileFormState(action.profile);
    case "setHeadline":
      return { ...state, headline: action.headline };
    case "setBio":
      return { ...state, bio: action.bio };
    case "addProject": {
      const newProj: ShowcaseProject = {
        id: `proj-${Date.now()}`,
        title: "New Featured Project",
        description: "Brief summary of what was built, key architecture decisions, and technologies used.",
        is_private: false,
        tags: ["Go", "Next.js"],
        image_urls: [],
        stars: 0,
      };
      return { ...state, showcaseProjects: [newProj, ...state.showcaseProjects] };
    }
    case "updateProject": {
      const updatedList = [...state.showcaseProjects];
      updatedList[action.index] = { ...updatedList[action.index], ...action.updated };
      return { ...state, showcaseProjects: updatedList };
    }
    case "removeProject":
      return { ...state, showcaseProjects: state.showcaseProjects.filter((_, i) => i !== action.index) };
    case "togglePin":
      return {
        ...state,
        pinnedRepos: state.pinnedRepos.includes(action.fullName)
          ? state.pinnedRepos.filter((r) => r !== action.fullName)
          : [...state.pinnedRepos, action.fullName],
      };
    case "setAvailableRepos":
      return { ...state, availableRepos: action.repos };
    case "setLoadingRepos":
      return { ...state, loadingRepos: action.loading };
    case "setSaving":
      return { ...state, isSaving: action.saving };
    case "setTab":
      return { ...state, activeTab: action.tab };
    case "setError":
      return { ...state, error: action.error };
  }
}

async function fetchUserRepos(
  dispatch: React.Dispatch<ProfileFormAction>
): Promise<void> {
  dispatch({ type: "setLoadingRepos", loading: true });
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/user/github-repos`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.repos && Array.isArray(data.repos)) {
        dispatch({ type: "setAvailableRepos", repos: data.repos });
      }
    }
  } catch {
    // Degrade to existing repos
  } finally {
    dispatch({ type: "setLoadingRepos", loading: false });
  }
}

/** Single useReducer-based form store. Resets + refreshes repos whenever the modal opens. */
export function useProfileForm(profile: PublicProfile, isOpen: boolean) {
  const [state, dispatch] = useReducer(profileFormReducer, profile, initialProfileFormState);

  useEffect(() => {
    if (isOpen) {
      dispatch({ type: "reset", profile });
      void fetchUserRepos(dispatch);
    }
  }, [isOpen, profile]);

  return { state, dispatch };
}
