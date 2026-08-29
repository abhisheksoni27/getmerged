"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, Loader2, Sparkles, Image as ImageIcon, Star, Pin, Lock, Globe } from "lucide-react";
import type { PublicProfile, ShowcaseProject, UserPublicRepo } from "@/lib/public-profile";
import { API_BASE_URL } from "@/lib/api";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicProfile;
  onProfileUpdated: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const [headline, setHeadline] = useState(profile.headline || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [showcaseProjects, setShowcaseProjects] = useState<ShowcaseProject[]>(
    profile.showcase_projects || []
  );
  const [pinnedRepos, setPinnedRepos] = useState<string[]>(
    (profile.public_repos || []).filter((r) => r.is_pinned).map((r) => r.full_name)
  );

  const [availableRepos, setAvailableRepos] = useState<UserPublicRepo[]>(
    profile.public_repos || []
  );
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"about" | "showcase" | "repos">("about");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHeadline(profile.headline || "");
      setBio(profile.bio || "");
      setShowcaseProjects(profile.showcase_projects || []);
      setPinnedRepos((profile.public_repos || []).filter((r) => r.is_pinned).map((r) => r.full_name));
      fetchUserRepos();
    }
  }, [isOpen, profile]);

  const fetchUserRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/github-repos`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.repos && Array.isArray(data.repos)) {
          setAvailableRepos(data.repos);
        }
      }
    } catch {
      // Degrade to existing repos
    } finally {
      setLoadingRepos(false);
    }
  };

  if (!isOpen) return null;

  const handleAddProject = () => {
    const newProj: ShowcaseProject = {
      id: `proj-${Date.now()}`,
      title: "New Featured Project",
      description: "Brief summary of what was built, key architecture decisions, and technologies used.",
      is_private: false,
      tags: ["Go", "Next.js"],
      image_urls: [],
      stars: 0,
    };
    setShowcaseProjects([newProj, ...showcaseProjects]);
  };

  const handleUpdateProject = (index: number, updated: Partial<ShowcaseProject>) => {
    const updatedList = [...showcaseProjects];
    updatedList[index] = { ...updatedList[index], ...updated };
    setShowcaseProjects(updatedList);
  };

  const handleRemoveProject = (index: number) => {
    setShowcaseProjects(showcaseProjects.filter((_, i) => i !== index));
  };

  const togglePinRepo = (fullName: string) => {
    if (pinnedRepos.includes(fullName)) {
      setPinnedRepos(pinnedRepos.filter((r) => r !== fullName));
    } else {
      setPinnedRepos([...pinnedRepos, fullName]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          headline: headline.trim(),
          bio: bio.trim(),
          showcase_projects: showcaseProjects,
          pinned_repos: pinnedRepos,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile changes");
      }

      onProfileUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
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
            onClick={() => setActiveTab("about")}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors ${
              activeTab === "about"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Bio & Headline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("showcase")}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "showcase"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Showcase Projects ({showcaseProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("repos")}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "repos"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Pinned Repos ({pinnedRepos.length})
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          {/* TAB 1: ABOUT / BIO */}
          {activeTab === "about" && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wider font-bold mb-1.5">
                  Professional Headline / Role
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Principal Backend Engineer @ Startup | Distributed Systems & Go"
                  maxLength={120}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-white/[0.12] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <p className="text-[11px] font-mono text-zinc-500 mt-1">Max 120 characters.</p>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wider font-bold mb-1.5">
                  Bio / About Me
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  placeholder="Tell your story: what you are building, open-source focus areas, core stack, and engineering philosophy."
                  maxLength={1000}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-white/[0.12] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors leading-relaxed"
                />
                <p className="text-[11px] font-mono text-zinc-500 mt-1">
                  {bio.length}/1000 characters. Supports line breaks and markdown.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SHOWCASE / PINNED PROJECTS WITH PHOTOS */}
          {activeTab === "showcase" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-sans text-white">Featured Project Showcases</h3>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    Showcase public or private work with screenshots, live demo links, and descriptions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Project
                </button>
              </div>

              {showcaseProjects.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-white/[0.12] text-center text-xs text-zinc-400 font-sans">
                  No showcase projects added yet. Click &quot;Add Project&quot; above to feature your top apps or private client work!
                </div>
              ) : (
                <div className="space-y-4">
                  {showcaseProjects.map((proj, idx) => (
                    <div
                      key={proj.id || idx}
                      className="p-4 rounded-xl border border-white/[0.1] bg-black/40 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={proj.title}
                          onChange={(e) => handleUpdateProject(idx, { title: e.target.value })}
                          placeholder="Project Title"
                          className="font-bold text-sm bg-transparent border-b border-white/[0.1] focus:border-amber-400 text-white pb-1 flex-1 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveProject(idx)}
                          aria-label="Remove project"
                          className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <textarea
                        value={proj.description}
                        onChange={(e) => handleUpdateProject(idx, { description: e.target.value })}
                        rows={2}
                        placeholder="What problem does this solve? What architecture did you use?"
                        className="w-full text-xs p-2 rounded bg-black/60 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                            Live Demo URL
                          </label>
                          <input
                            type="url"
                            value={proj.demo_url || ""}
                            onChange={(e) => handleUpdateProject(idx, { demo_url: e.target.value })}
                            placeholder="https://myapp.com"
                            className="w-full p-2 rounded bg-black/60 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                            GitHub Repository URL (Optional)
                          </label>
                          <input
                            type="url"
                            value={proj.repo_url || ""}
                            onChange={(e) => handleUpdateProject(idx, { repo_url: e.target.value })}
                            placeholder="https://github.com/username/repo"
                            className="w-full p-2 rounded bg-black/60 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Screenshot / Photo URLs */}
                      <div>
                        <label className="block text-[11px] font-mono text-zinc-400 mb-1 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5 text-blue-400" />
                          Screenshot & Photo URLs (comma separated)
                        </label>
                        <input
                          type="text"
                          value={(proj.image_urls || []).join(", ")}
                          onChange={(e) =>
                            handleUpdateProject(idx, {
                              image_urls: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="https://mycdn.com/shot1.png, https://mycdn.com/shot2.png"
                          className="w-full p-2 rounded bg-black/60 border border-white/[0.08] text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={(proj.tags || []).join(", ")}
                            onChange={(e) =>
                              handleUpdateProject(idx, {
                                tags: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="Tags: Go, Docker, React"
                            className="p-1.5 rounded bg-black/60 border border-white/[0.08] text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-mono text-zinc-300">
                          <input
                            type="checkbox"
                            checked={proj.is_private || false}
                            onChange={(e) => handleUpdateProject(idx, { is_private: e.target.checked })}
                            className="rounded bg-black border-white/20 text-amber-500 focus:ring-0"
                          />
                          <span className="flex items-center gap-1">
                            <Lock className="h-3 w-3 text-amber-400" /> Private Project Showcase
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUTO-POPULATED PUBLIC REPOS & PINNING */}
          {activeTab === "repos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-sans text-white">Public Repositories</h3>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    Select repositories to pin at the top of your profile.
                  </p>
                </div>
                {loadingRepos && <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />}
              </div>

              {availableRepos.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-white/[0.12] text-center text-xs text-zinc-400 font-sans">
                  No public repositories found. Connect your GitHub account to auto-import your top-starred projects.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableRepos.map((repo) => {
                    const isPinned = pinnedRepos.includes(repo.full_name);
                    return (
                      <button
                        key={repo.full_name}
                        type="button"
                        onClick={() => togglePinRepo(repo.full_name)}
                        className={`p-3 rounded-xl border text-left flex items-start justify-between gap-2 transition-all cursor-pointer ${
                          isPinned
                            ? "bg-amber-950/30 border-amber-500/60 text-white"
                            : "bg-black/40 border-white/[0.08] text-zinc-300 hover:bg-black/60"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white truncate">
                            <Globe className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{repo.name || repo.full_name}</span>
                          </div>
                          {repo.description && (
                            <p className="text-[11px] text-zinc-400 font-sans line-clamp-2 mt-1">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-zinc-400">
                            {repo.language && <span className="text-zinc-300">{repo.language}</span>}
                            <span className="flex items-center gap-1 text-amber-400">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {repo.stars}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`p-1.5 rounded-md ${
                            isPinned
                              ? "bg-amber-500 text-black"
                              : "bg-white/[0.06] text-zinc-400 hover:text-white"
                          }`}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08] bg-[#161616]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-mono inline-flex items-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
          >
            {isSaving ? (
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
