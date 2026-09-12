"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { ContributorKarmaData } from "@/components/KarmaProfileBadge";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { DeleteAccountModal } from "@/components/DeleteAccountModal";
import { ProofOfWorkResumeModal } from "@/components/ProofOfWorkResumeModal";
import type { PublicProfile } from "@/lib/public-profile";
import { useProfileData } from "./profile-sections/useProfileData";
import { useProfileUi } from "./profile-sections/useProfileUi";
import { ProfileHeader } from "./profile-sections/ProfileHeader";
import { KarmaSection } from "./profile-sections/KarmaSection";
import { RepoSections } from "./profile-sections/RepoSections";
import { ActivitySections } from "./profile-sections/ActivitySections";
import { RecruiterBlock } from "./profile-sections/RecruiterBlock";

interface ProfileClientViewProps {
  initialProfile: PublicProfile;
  initialKarma?: ContributorKarmaData | null;
}

export const ProfileClientView: React.FC<ProfileClientViewProps> = ({
  initialProfile,
  initialKarma = null,
}) => {
  const router = useRouter();
  const {
    profile,
    setProfile,
    currentUser,
    setCurrentUser,
    isOwner,
    hasEvals,
    accuracyPct,
    evalFeed,
    languages,
    totalLangPRs,
    showcaseProjects,
    publicRepos,
    slugOrUsername,
  } = useProfileData(initialProfile);
  const {
    isEditModalOpen,
    setIsEditModalOpen,
    isResumeModalOpen,
    setIsResumeModalOpen,
    isMenuOpen,
    setIsMenuOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    menuRef,
    handleLogout,
  } = useProfileUi(() => setCurrentUser(null));

  if (!profile) return null;

  return (
    <>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-10">
        {/* Section 1: Executive Contributor Header */}
        <ProfileHeader
          profile={profile}
          isOwner={isOwner}
          currentUser={currentUser}
          menuRef={menuRef}
          isMenuOpen={isMenuOpen}
          onToggleMenu={() => setIsMenuOpen((prev) => !prev)}
          onOpenEdit={() => setIsEditModalOpen(true)}
          onOpenResume={() => setIsResumeModalOpen(true)}
          onOpenDelete={() => {
            setIsMenuOpen(false);
            setIsDeleteModalOpen(true);
          }}
          onLogout={handleLogout}
        />

        {/* Talent Pass Toggle + Proof-of-Work Karma & Reputation Section */}
        <KarmaSection slugOrUsername={slugOrUsername} initialKarma={initialKarma} />

        <RepoSections
          profile={profile}
          showcaseProjects={showcaseProjects}
          publicRepos={publicRepos}
          isOwner={isOwner}
          onOpenEdit={() => setIsEditModalOpen(true)}
        />

        <ActivitySections
          profile={profile}
          accuracyPct={accuracyPct}
          hasEvals={hasEvals}
          evalFeed={evalFeed}
          languages={languages}
          totalLangPRs={totalLangPRs}
        />

        <RecruiterBlock username={profile.username} slug={profile.slug} />
      </main>

      {/* Edit Profile Modal */}
      {isOwner && (
        <ProfileEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onProfileUpdated={(updated) => {
            if (updated) {
              setProfile((prev) => ({ ...prev, ...updated }));
            }
            router.refresh();
          }}
        />
      )}

      {/* Proof of Work Resume Modal */}
      <ProofOfWorkResumeModal
        profile={profile}
        karma={initialKarma}
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
      />

      {/* Delete Account Modal */}
      {isOwner && (
        <DeleteAccountModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          username={profile.username}
        />
      )}
    </>
  );
};
