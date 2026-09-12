"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { UserRepoItem } from "./stackTypes";

// Picker state: repo selection, tabs, manifest input. No results state here.
export function useStackPicker() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRepos, setUserRepos] = useState<UserRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [customRepoInput, setCustomRepoInput] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"github" | "manual">("github");
  const [manifestContent, setManifestContent] = useState<string>("");

  const fetchUserRepositories = useCallback(async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/stack/user-repos`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.repositories) {
          setUserRepos(data.repositories);
          if (data.repositories.length > 0) {
            setSelectedRepo(data.repositories[0].full_name);
          }
        }
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    const hasToken =
      typeof document !== "undefined" && document.cookie.includes("opendoor_token=");
    setIsAuthenticated(hasToken);

    if (hasToken) {
      fetchUserRepositories();
    }
  }, [fetchUserRepositories]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setManifestContent(content);
      setActiveTab("manual");
    };
    reader.readAsText(file);
  }, []);

  return {
    isAuthenticated,
    userRepos,
    loadingRepos,
    selectedRepo,
    setSelectedRepo,
    customRepoInput,
    setCustomRepoInput,
    activeTab,
    setActiveTab,
    manifestContent,
    setManifestContent,
    handleFileUpload,
  };
}
