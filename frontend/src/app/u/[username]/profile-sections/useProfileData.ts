"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import type { User } from "@/types/opendoor";
import type { PublicProfile } from "@/lib/public-profile";

export function useProfileData(initialProfile: PublicProfile) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PublicProfile>(initialProfile);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const isOwner = useMemo(
    () =>
      !!currentUser &&
      (currentUser.slug?.toLowerCase() === profile.slug.toLowerCase() ||
        currentUser.username?.toLowerCase() === profile.username.toLowerCase()),
    [currentUser, profile.slug, profile.username]
  );

  const hasEvals = profile.total_evals > 0;

  const accuracyPct = useMemo(
    () =>
      profile.accuracy_rate !== null && profile.accuracy_n > 0
        ? Math.round(profile.accuracy_rate * 100)
        : null,
    [profile.accuracy_rate, profile.accuracy_n]
  );

  const evalFeed = useMemo(() => profile.evals ?? [], [profile.evals]);
  const dna = profile.dna;

  const languages = useMemo(
    () =>
      dna?.language_breakdown
        ? Object.entries(dna.language_breakdown).sort((a, b) => b[1] - a[1])
        : [],
    [dna?.language_breakdown]
  );

  const totalLangPRs = useMemo(
    () => languages.reduce((acc, [, count]) => acc + count, 0),
    [languages]
  );

  const showcaseProjects = useMemo(() => profile.showcase_projects || [], [profile.showcase_projects]);
  const publicRepos = useMemo(() => profile.public_repos || [], [profile.public_repos]);
  const slugOrUsername = useMemo(
    () => profile.slug || profile.username,
    [profile.slug, profile.username]
  );

  return {
    profile,
    setProfile,
    currentUser,
    setCurrentUser,
    isOwner,
    hasEvals,
    accuracyPct,
    evalFeed,
    dna,
    languages,
    totalLangPRs,
    showcaseProjects,
    publicRepos,
    slugOrUsername,
  };
}

export type ProfileData = ReturnType<typeof useProfileData>;
